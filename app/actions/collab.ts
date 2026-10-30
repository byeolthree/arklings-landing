"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyAttachment } from "@/lib/collab-file";
import { notifyNewRequest } from "@/lib/collab-notify";
import { parseForm, UUID_RE, type FieldErrors } from "@/lib/collab";
import { getOrigin } from "@/lib/origin";
import { getClientKey, isRateLimited, recordAttempt } from "@/lib/ratelimit";
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
  } catch {
    return { message: UNAVAILABLE, values };
  }

  // 4) 파일 올리기 → 저장. id는 앱에서 미리 만든다(저장 뒤에 읽어 올 권한이 필요 없게).
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
        source_work_id: values.source_work_id || null,
        roles,
        idea: values.idea,
        portfolio_url: values.portfolio_url,
        consent: true,
        attachment_path,
        attachment_name: file ? file.name : null,
        recipient_kind: "arklings",
        recipient_id: null,
      });
    if (error) {
      await removeFile(attachment_path);
      return { message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", values };
    }
  } catch {
    await removeFile(attachment_path);
    return { message: UNAVAILABLE, values };
  }

  // 5) 메일은 응답을 보낸 뒤에 보낸다. 메일이 실패해도 접수는 이미 끝나 있다.
  const origin = await getOrigin();
  after(() =>
    notifyNewRequest({
      origin,
      recipientKind: "arklings",
      recipientId: null,
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
