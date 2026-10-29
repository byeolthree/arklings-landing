"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasGateAccess } from "@/lib/admin-gate";
import { getSupabase, BUCKET } from "@/lib/supabase";
import { parseForm, UUID_RE, type FieldErrors } from "@/lib/collab";

const GATE_MESSAGE = "운영자 확인이 필요합니다. 협업 신청 목록 화면에서 비밀번호를 다시 입력해 주세요.";

export type FormState = {
  errors?: FieldErrors;
  message?: string;
  values?: Record<string, string>;
};

async function uploadFile(file: File): Promise<{ path?: string; error?: string }> {
  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: file.type });
  return error ? { error: error.message } : { path };
}

async function removeFile(path: string | null | undefined) {
  if (path) await getSupabase().storage.from(BUCKET).remove([path]);
}

export async function createCollab(_prev: FormState, fd: FormData): Promise<FormState> {
  const { values, roles, file, errors } = parseForm(fd, { withStatus: false });
  if (Object.keys(errors).length) return { errors, values };

  let attachment_path: string | null = null;
  if (file) {
    const up = await uploadFile(file);
    if (up.error) return { message: "파일을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.", values };
    attachment_path = up.path!;
  }

  const { data, error } = await getSupabase()
    .from("collab_requests")
    .insert({
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
    })
    .select("id")
    .single();

  if (error || !data) {
    await removeFile(attachment_path);
    return { message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", values };
  }
  revalidatePath("/collab");
  redirect(`/collab/done?id=${data.id}`);
}

export async function updateCollab(
  id: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  if (!(await hasGateAccess())) return { message: GATE_MESSAGE };
  if (!UUID_RE.test(id)) return { message: "찾을 수 없는 신청입니다." };
  const { values, roles, file, removeFile: wantRemove, errors } = parseForm(fd, { withStatus: true });
  if (Object.keys(errors).length) return { errors, values };

  const sb = getSupabase();
  const { data: current } = await sb
    .from("collab_requests")
    .select("attachment_path, attachment_name")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { message: "찾을 수 없는 신청입니다." };

  let attachment_path = current.attachment_path as string | null;
  let attachment_name = current.attachment_name as string | null;
  let newPath: string | null = null;

  if (file) {
    const up = await uploadFile(file);
    if (up.error) return { message: "파일을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.", values };
    newPath = up.path!;
    attachment_path = newPath;
    attachment_name = file.name;
  } else if (wantRemove) {
    attachment_path = null;
    attachment_name = null;
  }

  const { error } = await sb
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
    .eq("id", id);

  if (error) {
    await removeFile(newPath);
    return { message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", values };
  }
  if (current.attachment_path && current.attachment_path !== attachment_path) {
    await removeFile(current.attachment_path);
  }
  revalidatePath("/collab");
  revalidatePath(`/collab/${id}`);
  redirect(`/collab/${id}?saved=updated`);
}

export async function deleteCollab(id: string): Promise<FormState> {
  if (!(await hasGateAccess())) return { message: GATE_MESSAGE };
  if (!UUID_RE.test(id)) return { message: "찾을 수 없는 신청입니다." };
  const sb = getSupabase();
  const { data: current } = await sb
    .from("collab_requests")
    .select("attachment_path")
    .eq("id", id)
    .maybeSingle();
  const { error } = await sb.from("collab_requests").delete().eq("id", id);
  if (error) return { message: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  await removeFile(current?.attachment_path);
  revalidatePath("/collab");
  redirect("/collab?deleted=1");
}
