"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { UUID_RE } from "@/lib/collab";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { buildPlanPdf, pdfFileName } from "@/lib/plan-pdf";
import { planPdfMail } from "@/lib/plan-mail";
import {
  fromStored,
  MAX_REVISIONS,
  parseDraft,
  type PlanPanel,
  titleOrDefault,
  toPublicContent,
  toStored,
  type PlanDraft,
} from "@/lib/plans";
import { loadPlanPanel } from "@/lib/plans-server";
import { createAuthClient } from "@/lib/supabase/server";

export type Fail = { ok: false; error: string; needLogin?: boolean };
type Ok<T> = { ok: true } & T;

const LOGIN_MESSAGE = "저장하려면 로그인이 필요합니다.";
const UNAVAILABLE = "지금은 처리할 수 없어요. 잠시 뒤에 다시 시도해 주세요.";
const NOT_FOUND = "찾을 수 없는 기획안이에요.";

// 모든 동작은 맨 위에서 다시 로그인을 확인한다. (화면에서 버튼을 막았더라도 이 입구는 따로 열려 있다)
async function needUser(): Promise<{ user: CurrentUser } | Fail> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: LOGIN_MESSAGE, needLogin: true };
  return { user };
}

// 바뀐 뒤의 이력·공개 상태를 화면에 돌려준다(화면이 서버에서 다시 읽지 않아도 되게).
async function panelOf(planId: string, ownerId: string): Promise<PlanPanel | null> {
  try {
    return await loadPlanPanel(planId, ownerId);
  } catch {
    return null;
  }
}

function limitMessage(message: string | undefined): string | null {
  if (!message) return null;
  if (message.includes("revision_limit_reached")) {
    return `임시저장은 기획안 하나당 ${MAX_REVISIONS}건까지예요. 오래된 기록을 지운 뒤 다시 저장해 주세요.`;
  }
  if (message.includes("plan_limit_reached")) return "기획안은 30건까지 만들 수 있어요. 안 쓰는 기획안을 지운 뒤 다시 저장해 주세요.";
  return null;
}

function draftOf(raw: unknown): { draft: PlanDraft } | Fail {
  const parsed = parseDraft(raw);
  return parsed.ok ? { draft: parsed.draft } : { ok: false, error: parsed.error };
}

// 「임시저장」: 이력을 한 건 더한다. 기획안이 아직 없으면(planId가 null) 기획안도 새로 만든다.
export async function savePlan(planId: string | null, raw: unknown): Promise<Ok<{ planId: string; revisionId: string; panel: PlanPanel | null }> | Fail> {
  const auth = await needUser();
  if ("ok" in auth) return auth;
  const parsed = draftOf(raw);
  if ("ok" in parsed) return parsed;
  const { draft } = parsed;
  if (planId !== null && !UUID_RE.test(planId)) return { ok: false, error: NOT_FOUND };
  const title = titleOrDefault(draft.title, draft);
  const content = toStored(draft);

  let createdPlan = false;
  let id = planId;
  try {
    const sb = await createAuthClient();
    if (id === null) {
      const { data, error } = await sb.from("plans").insert({ owner_id: auth.user.id, title }).select("id").single();
      if (error || !data) return { ok: false, error: limitMessage(error?.message) ?? "저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요." };
      id = data.id as string;
      createdPlan = true;
    } else {
      const { data, error } = await sb.from("plans").update({ title }).eq("id", id).select("id");
      if (error || !data || data.length === 0) return { ok: false, error: NOT_FOUND };
    }

    const { data: rev, error: revError } = await sb
      .from("plan_revisions")
      .insert({ plan_id: id, owner_id: auth.user.id, selections: content.selections, suggested: content.suggested, edited: content.edited })
      .select("id")
      .single();
    if (revError || !rev) {
      // 방금 새로 만든 빈 기획안이 남지 않게 치운다.
      if (createdPlan) await sb.from("plans").delete().eq("id", id);
      return { ok: false, error: limitMessage(revError?.message) ?? "저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요." };
    }
    revalidatePath("/mypage");
    return { ok: true, planId: id, revisionId: rev.id as string, panel: await panelOf(id, auth.user.id) };
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
}

// 이력 한 건의 내용을 편집 화면에 불러온다.
export async function getRevision(planId: string, revisionId: string): Promise<Ok<{ draft: PlanDraft }> | Fail> {
  const auth = await needUser();
  if ("ok" in auth) return auth;
  if (!UUID_RE.test(planId) || !UUID_RE.test(revisionId)) return { ok: false, error: NOT_FOUND };
  try {
    const sb = await createAuthClient();
    const { data, error } = await sb
      .from("plan_revisions")
      .select("selections, edited, plans!inner(title)")
      .eq("id", revisionId)
      .eq("plan_id", planId)
      .maybeSingle();
    if (error || !data) return { ok: false, error: "기록을 찾을 수 없어요." };
    const plan = data.plans as unknown as { title: string } | { title: string }[];
    const title = Array.isArray(plan) ? plan[0]?.title : plan?.title;
    const draft = fromStored(title ?? "", data.selections, data.edited);
    if (!draft) return { ok: false, error: "이 기록을 불러올 수 없어요." };
    return { ok: true, draft };
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
}

// 이력의 내용을 그 자리에서 고친다. 원래 내용은 사라진다(화면에서 미리 알려 준다).
export async function updateRevision(planId: string, revisionId: string, raw: unknown): Promise<Ok<{ panel: PlanPanel | null }> | Fail> {
  const auth = await needUser();
  if ("ok" in auth) return auth;
  const parsed = draftOf(raw);
  if ("ok" in parsed) return parsed;
  if (!UUID_RE.test(planId) || !UUID_RE.test(revisionId)) return { ok: false, error: NOT_FOUND };
  const content = toStored(parsed.draft);
  try {
    const sb = await createAuthClient();
    const { data, error } = await sb
      .from("plan_revisions")
      .update({ selections: content.selections, suggested: content.suggested, edited: content.edited })
      .eq("id", revisionId)
      .eq("plan_id", planId)
      .select("id");
    if (error || !data || data.length === 0) return { ok: false, error: "기록을 찾을 수 없어요." };
    const title = titleOrDefault(parsed.draft.title, parsed.draft);
    await sb.from("plans").update({ title }).eq("id", planId);
    revalidatePath("/mypage");
    return { ok: true, panel: await panelOf(planId, auth.user.id) };
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
}

export async function deleteRevision(planId: string, revisionId: string): Promise<Ok<{ panel: PlanPanel | null }> | Fail> {
  const auth = await needUser();
  if ("ok" in auth) return auth;
  if (!UUID_RE.test(planId) || !UUID_RE.test(revisionId)) return { ok: false, error: NOT_FOUND };
  try {
    const sb = await createAuthClient();
    const { data, error } = await sb.from("plan_revisions").delete().eq("id", revisionId).eq("plan_id", planId).select("id");
    if (error || !data || data.length === 0) return { ok: false, error: "삭제하지 못했어요. 이미 지워진 기록일 수 있어요." };
    return { ok: true, panel: await panelOf(planId, auth.user.id) };
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
}

export async function deletePlan(planId: string): Promise<Ok<object> | Fail> {
  const auth = await needUser();
  if ("ok" in auth) return auth;
  if (!UUID_RE.test(planId)) return { ok: false, error: NOT_FOUND };
  try {
    const sb = await createAuthClient();
    const { data, error } = await sb.from("plans").delete().eq("id", planId).select("id");
    if (error || !data || data.length === 0) return { ok: false, error: "삭제하지 못했어요. 이미 지워진 기획안일 수 있어요." };
    revalidatePath("/mypage");
    return { ok: true };
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
}

// 공개 여부. 켤 때는 "지금 화면의 완성 내용"을 공개용 사본으로 저장한다(이력·선택지는 공개되지 않는다).
// 끄면 공개용 사본도 함께 지운다.
export async function setPlanPublic(planId: string, makePublic: boolean, raw: unknown): Promise<Ok<{ panel: PlanPanel | null }> | Fail> {
  const auth = await needUser();
  if ("ok" in auth) return auth;
  if (!UUID_RE.test(planId)) return { ok: false, error: NOT_FOUND };

  let patch: { is_public: boolean; published_at: string | null; public_content: unknown; title?: string };
  if (makePublic) {
    const parsed = draftOf(raw);
    if ("ok" in parsed) return parsed;
    const { draft } = parsed;
    const hasContent = draft.slots.some((s) => s.trim()) || (draft.edited ?? "").trim() !== "";
    if (!hasContent) return { ok: false, error: "공개하려면 먼저 내용을 써 주세요." };
    patch = { is_public: true, published_at: new Date().toISOString(), public_content: toPublicContent(draft), title: titleOrDefault(draft.title, draft) };
  } else {
    patch = { is_public: false, published_at: null, public_content: null };
  }
  try {
    const sb = await createAuthClient();
    const { data, error } = await sb.from("plans").update(patch).eq("id", planId).select("id");
    if (error || !data || data.length === 0) return { ok: false, error: NOT_FOUND };
    revalidatePath("/mypage");
    revalidatePath("/portfolio");
    return { ok: true, panel: await panelOf(planId, auth.user.id) };
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
}

// PDF 내려받기: 지금 화면의 완성본(고친 글 포함)으로 서버가 PDF를 만든다. 서버에는 저장하지 않는다.
export async function downloadPlanPdf(raw: unknown): Promise<Ok<{ base64: string; filename: string }> | Fail> {
  const auth = await needUser();
  if ("ok" in auth) return { ...auth, error: "내려받으려면 로그인이 필요합니다." };
  const parsed = draftOf(raw);
  if ("ok" in parsed) return parsed;
  const title = titleOrDefault(parsed.draft.title, parsed.draft);
  try {
    const pdf = await buildPlanPdf({ ...parsed.draft, title });
    return { ok: true, base64: pdf.toString("base64"), filename: pdfFileName(title) };
  } catch {
    console.error("[plans] PDF를 만들지 못했습니다.");
    return { ok: false, error: "PDF를 만들지 못했어요. 잠시 뒤에 다시 시도해 주세요." };
  }
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "내 이메일";
  return `${name.slice(0, 2)}${"*".repeat(Math.max(1, Math.min(name.length - 2, 4)))}@${domain}`;
}

// 메일 받기: 로그인한 본인의 "확인된" 이메일로만, 하루(한국 날짜) 3번까지. 받는 주소는 요청에서 받지 않는다.
export async function mailPlanPdf(raw: unknown): Promise<Ok<{ to: string }> | Fail> {
  const auth = await needUser();
  if ("ok" in auth) return { ...auth, error: "메일로 받으려면 로그인이 필요합니다." };
  const { user } = auth;
  if (!user.email || !user.emailConfirmed) {
    return { ok: false, error: "확인이 끝난 이메일이 있는 계정에서만 메일로 받을 수 있어요." };
  }
  const parsed = draftOf(raw);
  if ("ok" in parsed) return parsed;
  if (!isMailConfigured()) return { ok: false, error: "메일 보내기가 아직 준비되지 않았어요. PDF 내려받기를 이용해 주세요." };

  const title = titleOrDefault(parsed.draft.title, parsed.draft);
  let reserved = false;
  try {
    const sb = await createAuthClient();
    const { data, error } = await sb.rpc("reserve_plan_mail");
    if (error) return { ok: false, error: UNAVAILABLE };
    if (data !== true) return { ok: false, error: "오늘은 메일을 3번 모두 보냈어요. 한국 시간으로 내일 다시 받을 수 있어요." };
    reserved = true;

    const pdf = await buildPlanPdf({ ...parsed.draft, title });
    const mail = planPdfMail(title);
    const sent = await sendMail({
      to: user.email,
      ...mail,
      attachments: [{ filename: pdfFileName(title), content: pdf, contentType: "application/pdf" }],
    });
    if (!sent.ok) {
      await sb.rpc("release_plan_mail");
      return { ok: false, error: "메일을 보내지 못했어요. 잠시 뒤에 다시 시도해 주세요. (횟수는 줄지 않았어요)" };
    }
    return { ok: true, to: maskEmail(user.email) };
  } catch {
    if (reserved) {
      try {
        const sb = await createAuthClient();
        await sb.rpc("release_plan_mail");
      } catch {
        console.error("[plans] 메일 횟수를 되돌리지 못했습니다.");
      }
    }
    return { ok: false, error: UNAVAILABLE };
  }
}
