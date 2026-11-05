"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { CONFIRM_FIRST_MESSAGE, getCurrentUser, isConfirmed } from "@/lib/auth";
import { verifyAttachment } from "@/lib/collab-file";
import { notifyNewRequest } from "@/lib/collab-notify";
import { sendMail } from "@/lib/mail";
import { applicantReply } from "@/lib/mail-templates";
import { parseForm, UUID_RE, type FieldErrors } from "@/lib/collab";
import { getOrigin } from "@/lib/origin";
import { getClientKey, isRateLimited, RateLimitUnavailable, recordAttempt } from "@/lib/ratelimit";
import { BUCKET } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";

export type FormState = {
  errors?: FieldErrors;
  message?: string;
  values?: Record<string, string>;
};

const LOGIN_MESSAGE = "로그인이 풀렸어요. 다시 로그인한 뒤 시도해 주세요.";
const NOT_FOUND = "찾을 수 없는 신청입니다.";
const UNAVAILABLE = "지금은 저장할 수 없어요. 잠시 뒤에 다시 시도해 주세요.";
// 개발 화면에서만 원인을 한 줄 덧붙인다(운영 화면에는 내부 오류 글을 내보내지 않는다).
const devDetail = (e: unknown) => (process.env.NODE_ENV === "production" ? "" : ` [개발 화면 전용: ${e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e)}]`);
const PLAN_GONE = "이 기획안은 더 이상 공개되어 있지 않아 신청할 수 없어요. 포트폴리오에서 다른 기획안을 찾아 주세요.";

// 기획안으로 들어온 신청의 받는 사람은 서버가 plan_id로 기획안을 찾아 정한다(화면에서 받는 사람 번호를 받지 않는다).
// 공개 중인 기획안이고, 주인이 이메일 확인을 마쳤을 때만 받을 수 있다. DB도 같은 규칙을 저장 순간에 한 번 더 확인한다.
async function findPlanRecipient(planId: string): Promise<{ ownerId: string } | "gone" | "error"> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("plans").select("owner_id, is_public").eq("id", planId).maybeSingle();
    if (error) return "error";
    if (!data || !data.is_public) return "gone";
    const { data: owner, error: ownerError } = await admin.auth.admin.getUserById(data.owner_id as string);
    if (ownerError || !owner.user) return "error";
    if (!owner.user.email || !owner.user.email_confirmed_at) return "gone";
    return { ownerId: data.owner_id as string };
  } catch {
    return "error";
  }
}

type Verified = Extract<Awaited<ReturnType<typeof verifyAttachment>>, { ok: true }>["kind"];

// 파일은 서버 전용 열쇠로만 올리고 지운다(로그인 없는 사람이 보관함을 직접 쓰지 못한다).
async function uploadFile(file: File, kind: Verified): Promise<{ path?: string; error?: string }> {
  const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${kind.ext}`;
  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: kind.type, upsert: false });
  return error ? { error: error.message } : { path };
}

async function removeFile(path: string | null | undefined) {
  if (!path) return;
  try {
    await createAdminClient().storage.from(BUCKET).remove([path]);
  } catch {
    console.error("[collab] 첨부 파일을 지우지 못했습니다(짝 없는 파일이 남았을 수 있음).");
  }
}

// 로그인 없이 누구나 접수할 수 있다. 접수는 서버가 검사한 뒤 서버 전용 열쇠로 저장한다.
export async function createCollab(_prev: FormState, fd: FormData): Promise<FormState> {
  // 1) 숨은 입력칸: 사람은 보지 못하는 칸이라, 채워져 있으면 봇이다. 저장하지 않고 조용히 성공처럼 보낸다.
  if (String(fd.get("extra_note") ?? "").trim() !== "") redirect("/collab/done");

  const { values, roles, file, errors } = parseForm(fd, { withStatus: false });
  if (Object.keys(errors).length) return { errors, values };

  // 2) 파일 내용 검사(형식·크기·이름만 바꾼 위장 파일)
  let kind: Verified | null = null;
  if (file) {
    const checked = await verifyAttachment(file);
    if (!checked.ok) return { errors: { attachment: checked.error }, values };
    kind = checked.kind;
  }

  // 3) 제출 횟수 제한(접속 주소는 해시로만 기록)
  try {
    const key = await getClientKey();
    if (await isRateLimited(key)) {
      return { message: "짧은 시간에 너무 많이 보내셨어요. 잠시(한 시간쯤) 뒤에 다시 시도해 주세요.", values };
    }
    await recordAttempt(key);
  } catch (e) {
    if (e instanceof RateLimitUnavailable && e.reason === "table_missing") {
      // 횟수 표가 이 DB에 없을 뿐이다(0003 전). 초과 제출이 아니므로 「너무 많이 보내셨어요」로 막지 않는다.
      console.warn(`[collab] submit_attempts 표가 이 DB에 없어 제출 횟수 제한을 확인하지 못했습니다(supabase/migrations/0003 필요): ${e.message}`);
      // 운영(production)에서는 횟수를 못 세면 안전하게 닫는다. 개발 화면에서는 한 번 보낸 신청이 막히지 않게 횟수 제한만 건너뛴다.
      if (process.env.NODE_ENV === "production") return { message: UNAVAILABLE, values };
    } else {
      console.error("[collab] 제출 횟수 제한을 확인하지 못했습니다.", e);
      return { message: UNAVAILABLE + devDetail(e), values };
    }
  }

  // 4) 기획안으로 온 신청이면 받는 사람(기획안 주인)을 서버가 찾는다. 아니면 아클링스(운영자)가 받는다.
  const planId = String(fd.get("plan_id") ?? "").trim();
  let ownerId: string | null = null;
  if (planId) {
    if (!UUID_RE.test(planId)) return { message: PLAN_GONE, values };
    const found = await findPlanRecipient(planId);
    if (found === "error") return { message: UNAVAILABLE, values };
    if (found === "gone") return { message: PLAN_GONE, values };
    ownerId = found.ownerId;
  }

  // 5) 파일 올리기 → 저장. id는 앱에서 미리 만든다(저장 뒤에 읽어 올 권한이 필요 없게).
  let attachment_path: string | null = null;
  try {
    if (file && kind) {
      const up = await uploadFile(file, kind);
      if (up.error) return { message: "파일을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.", values };
      attachment_path = up.path!;
    }

    const { error } = await createAdminClient()
      .from("collab_requests")
      .insert({
        id: randomUUID(),
        applicant_name: values.applicant_name,
        contact: values.contact,
        sns_handle: values.sns_handle,
        source_work_id: ownerId ? null : values.source_work_id || null,
        roles,
        idea: values.idea,
        portfolio_url: values.portfolio_url,
        consent: true,
        attachment_path,
        attachment_name: file ? file.name : null,
        recipient_kind: ownerId ? "user" : "arklings",
        recipient_id: ownerId,
        plan_id: ownerId ? planId : null,
      });
    if (error) {
      await removeFile(attachment_path);
      // 확인과 저장 사이에 주인이 공개를 끈 경우(DB가 막았다)
      if (error.message.includes("plan_not_public")) return { message: PLAN_GONE, values };
      console.error("[collab] 신청을 저장하지 못했습니다.", error);
      return { message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." + devDetail(error), values };
    }
  } catch (e) {
    await removeFile(attachment_path);
    console.error("[collab] 신청 저장 중 오류", e);
    return { message: UNAVAILABLE + devDetail(e), values };
  }

  // 6) 메일은 응답을 보낸 뒤에 보낸다. 받는 사람(기획안 주인 또는 아클링스)에게 알린다. 메일이 실패해도 접수는 이미 끝나 있다.
  const origin = await getOrigin();
  after(() =>
    notifyNewRequest({
      origin,
      recipientKind: ownerId ? "user" : "arklings",
      recipientId: ownerId,
      applicantName: values.applicant_name,
      contact: values.contact,
    }),
  );
  redirect("/collab/done");
}

// 수정·삭제는 그 신청의 받는 사람만 할 수 있다. DB의 접근 규칙(RLS)이 한 번 더 막아 주므로,
// 아래 읽기·수정·삭제는 모두 "로그인한 사용자 본인의 권한"으로 실행한다.
export async function updateCollab(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: LOGIN_MESSAGE };
  if (!isConfirmed(user)) return { message: CONFIRM_FIRST_MESSAGE };
  if (!UUID_RE.test(id)) return { message: NOT_FOUND };

  const { values, roles, file, removeFile: wantRemove, errors } = parseForm(fd, { withStatus: true });
  if (Object.keys(errors).length) return { errors, values };

  let kind: Verified | null = null;
  if (file) {
    const checked = await verifyAttachment(file);
    if (!checked.ok) return { errors: { attachment: checked.error }, values };
    kind = checked.kind;
  }

  let newPath: string | null = null;
  try {
    const sb = await createAuthClient();
    const { data: current } = await sb
      .from("collab_requests")
      .select("attachment_path, attachment_name")
      .eq("id", id)
      .maybeSingle();
    if (!current) return { message: NOT_FOUND };

    let attachment_path = current.attachment_path as string | null;
    let attachment_name = current.attachment_name as string | null;

    if (file && kind) {
      const up = await uploadFile(file, kind);
      if (up.error) return { message: "파일을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.", values };
      newPath = up.path!;
      attachment_path = newPath;
      attachment_name = file.name;
    } else if (wantRemove) {
      attachment_path = null;
      attachment_name = null;
    }

    const { data: updated, error } = await sb
      .from("collab_requests")
      .update({
        applicant_name: values.applicant_name,
        contact: values.contact,
        sns_handle: values.sns_handle,
        source_work_id: values.source_work_id || null,
        roles,
        idea: values.idea,
        portfolio_url: values.portfolio_url,
        consent: true,
        status: values.status,
        attachment_path,
        attachment_name,
      })
      .eq("id", id)
      .select("id");

    if (error || !updated || updated.length === 0) {
      await removeFile(newPath);
      return { message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", values };
    }
    if (current.attachment_path && current.attachment_path !== attachment_path) {
      await removeFile(current.attachment_path);
    }
  } catch {
    await removeFile(newPath);
    return { message: UNAVAILABLE, values };
  }
  revalidatePath("/collab");
  revalidatePath(`/collab/${id}`);
  redirect(`/collab/${id}?saved=updated`);
}

export async function deleteCollab(id: string): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: LOGIN_MESSAGE };
  if (!isConfirmed(user)) return { message: CONFIRM_FIRST_MESSAGE };
  if (!UUID_RE.test(id)) return { message: NOT_FOUND };

  let path: string | null = null;
  try {
    const sb = await createAuthClient();
    const { data: current } = await sb.from("collab_requests").select("attachment_path").eq("id", id).maybeSingle();
    if (!current) return { message: NOT_FOUND };
    path = current.attachment_path as string | null;

    const { data: deleted, error } = await sb.from("collab_requests").delete().eq("id", id).select("id");
    if (error || !deleted || deleted.length === 0) return { message: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  } catch {
    return { message: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  await removeFile(path);
  revalidatePath("/collab");
  redirect("/collab?deleted=1");
}

// 받은 신청에 대한 답장·수락·거절. 로그인한 받는 사람 본인의 권한으로 읽고 바꾸므로 DB 규칙(RLS)이 남의 신청은 막는다.
// 답장 글은 따로 저장하지 않고(저장할 칸이 없다) 신청자의 이메일로만 보낸다. 연락처가 이메일이 아니면 사이트에서 보낼 수 없다.
const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function replyCollab(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: LOGIN_MESSAGE };
  if (!isConfirmed(user)) return { message: CONFIRM_FIRST_MESSAGE };
  if (!UUID_RE.test(id)) return { message: NOT_FOUND };

  const decision = String(fd.get("decision") ?? "");
  if (decision !== "send" && decision !== "accept" && decision !== "reject" && decision !== "review") return { message: "동작을 알 수 없어요. 화면을 새로 열어 다시 시도해 주세요." };
  const text = String(fd.get("message") ?? "").trim();
  if (text.length > 1000) return { message: "답장은 1000자 이내로 써 주세요.", values: { message: text } };
  if (decision === "send" && text.length === 0) return { message: "보낼 답장을 써 주세요.", values: { message: text } };

  let note = "";
  try {
    const sb = await createAuthClient();
    const { data: row } = await sb.from("collab_requests").select("applicant_name, contact").eq("id", id).maybeSingle();
    if (!row) return { message: NOT_FOUND };
    const contact = String(row.contact).trim();
    const canMail = MAIL_RE.test(contact);
    if (decision === "send" && !canMail) {
      return { message: "신청자의 연락처가 이메일이 아니라서 사이트에서 답장을 보낼 수 없어요. 적힌 연락처로 직접 연락해 주세요.", values: { message: text } };
    }

    if (decision !== "send") {
      const { data: updated, error } = await sb
        .from("collab_requests")
        .update({ status: decision === "accept" ? "accepted" : decision === "reject" ? "rejected" : "reviewing" })
        .eq("id", id)
        .select("id");
      if (error || !updated || updated.length === 0) return { message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", values: { message: text } };
    }

    // 「검토 중」은 받는 사람 쪽 표시일 뿐이라 신청자에게 메일을 보내지 않는다.
    if (decision === "review") {
      /* 메일 없음 */
    } else if (canMail) {
      const m = applicantReply(String(row.applicant_name), decision === "accept" ? "accepted" : decision === "reject" ? "rejected" : null, text);
      const sent = await sendMail({ to: contact, ...m });
      if (!sent.ok) {
        note = decision === "send" ? "failed" : "mailfailed";
        if (decision === "send") return { message: "메일을 보내지 못했어요. 잠시 뒤에 다시 시도해 주세요.", values: { message: text } };
      }
    } else {
      note = "nomail";
    }
  } catch (e) {
    console.error("[collab] 답장·수락·거절 처리 중 오류", e);
    return { message: UNAVAILABLE + devDetail(e), values: { message: text } };
  }
  revalidatePath("/collab");
  revalidatePath(`/collab/${id}`);
  const saved = decision === "send" ? "replied" : decision === "accept" ? "accepted" : decision === "reject" ? "rejected" : "reviewing";
  redirect(`/collab/${id}?saved=${saved}${note ? `&mail=${note}` : ""}`);
}
