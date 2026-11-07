"use server";

// 크리에이터 프로필·채널 링크·작품·작품 안 요소를 만들고 고치고 지우는 Server Action 모음.
// 모든 동작은 맨 위에서 로그인과 이메일 확인을 다시 하고(화면에서 막았더라도 이 입구는 따로 열려 있다),
// 로그인한 본인 연결(createAuthClient)로 실행한다. 그래서 DB 규칙(RLS와 0009의 검사)이 한 번 더 막는다.
// 서버 전용 열쇠는 파일 올리기·지우기·임시 주소(lib/creator-files.ts)에서만 쓰이고, 그 전에 여기서 권한을 먼저 확인한다.
import { revalidatePath } from "next/cache";
import { CONFIRM_FIRST_MESSAGE, getCurrentUser, isConfirmed, type CurrentUser } from "@/lib/auth";
import {
  BLOCK_LIMIT,
  QUOTA_BYTES,
  parseYoutubeId,
  validateCreatorProfile,
  validateChannels,
  validateHandle,
  validateTextBlock,
  validateWork,
  normalizeHandle,
  type Channel,
  type FileKind,
  type ProfileErrors,
  type ProfileInput,
  type WorkErrors,
  type WorkInput,
} from "@/lib/creator-rules";
import { createUploadSlot, fileBelongsTo, inspectUploaded, maxBytesOf, removeOwnFiles } from "@/lib/creator-files";
import { createAuthClient } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";
import { setPlanPublic } from "@/app/actions/plans";
import { loglineText, parseDraft, titleOrDefault, type PlanPanel } from "@/lib/plans";

export type Fail = { ok: false; error: string; needLogin?: boolean; fieldErrors?: Record<string, string> };
type Ok<T = object> = { ok: true } & T;

const LOGIN_MESSAGE = "로그인이 필요해요.";
const UNAVAILABLE = "지금은 처리할 수 없어요. 잠시 뒤에 다시 시도해 주세요.";
const WORK_NOT_FOUND = "찾을 수 없는 작품이에요.";
const BLOCK_NOT_FOUND = "찾을 수 없는 요소예요.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Sb = Awaited<ReturnType<typeof createAuthClient>>;

// 모든 동작의 맨 위: 로그인과 이메일 확인을 다시 한다.
async function needUser(): Promise<{ user: CurrentUser; sb: Sb } | Fail> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: LOGIN_MESSAGE, needLogin: true };
  if (!isConfirmed(user)) return { ok: false, error: CONFIRM_FIRST_MESSAGE };
  try {
    return { user, sb: await createAuthClient() };
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
}

type DbError = { message?: string; code?: string } | null;

// DB가 돌려준 오류를 사람이 읽을 문장으로 바꾼다. 모르는 오류는 세부를 드러내지 않는다.
function dbMessage(e: DbError): string {
  const m = e?.message ?? "";
  if (m.includes("work_limit_reached")) return "작품은 12개까지 만들 수 있어요. 안 쓰는 작품을 지운 뒤 다시 시도해 주세요.";
  if (m.includes("block_limit_reached")) return `한 작품에는 요소를 ${BLOCK_LIMIT}개까지 넣을 수 있어요.`;
  if (m.includes("file_quota_exceeded")) return "올린 파일이 합쳐서 20MB를 넘어요. 안 쓰는 파일을 지운 뒤 다시 시도해 주세요.";
  if (m.includes("channel_limit_reached")) return "채널은 5개까지 넣을 수 있어요.";
  if (m.includes("creator_profile_required")) return "작품을 올리려면 먼저 크리에이터 프로필을 만들어 주세요.";
  if (m.includes("email_not_confirmed")) return CONFIRM_FIRST_MESSAGE;
  if (m.includes("work_plan_not_owned")) return "내 기획안만 붙일 수 있어요.";
  if (e?.code === "23505" && m.includes("plan_id")) return "이 기획안은 이미 다른 작품에 붙어 있어요.";
  if (e?.code === "23505") return "이미 쓰고 있는 공개 주소예요. 다른 주소를 적어 주세요.";
  if (e?.code === "42501") return "이 동작을 할 수 있는 권한이 없어요.";
  return UNAVAILABLE;
}

function refresh(handle?: string) {
  revalidatePath("/mypage");
  revalidatePath("/creators");
  if (handle) revalidatePath(`/creators/${handle}`);
}

// ── 프로필 ──────────────────────────────────────────────────────────────────────

// 공개 주소를 쓸 수 있는지 미리 알려 준다. 확정은 저장할 때 DB가 한다(비공개 프로필이 쓰는 주소는 여기서 보이지 않는다).
export async function checkHandle(handle: string): Promise<Ok<{ available: boolean }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const h = normalizeHandle(String(handle ?? ""));
  const problem = validateHandle(h);
  if (problem) return { ok: false, error: problem, fieldErrors: { handle: problem } };
  const { data: mine } = await auth.sb.from("creator_profiles").select("public_handle").eq("user_id", auth.user.id).maybeSingle();
  if (mine && (mine as { public_handle: string }).public_handle === h) return { ok: true, available: true };
  const { data, error } = await getSupabase().from("creators_public").select("public_handle").eq("public_handle", h).maybeSingle();
  if (error) return { ok: false, error: UNAVAILABLE };
  return { ok: true, available: !data };
}

// 채널 링크를 한 번에(DB 함수 한 번 호출 = 한 트랜잭션, 0011) 바꾼다. 실패하면 원래 채널이 그대로 남는다.
async function replaceChannels(sb: Sb, channels: Channel[]): Promise<string | null> {
  const { error } = await sb.rpc("replace_creator_channels", { p_channels: channels });
  return error ? dbMessage(error) : null;
}

// 프로필 만들기·고치기(없으면 만들고 있으면 고친다). 공개 주소는 한 번 정하면 바꿀 수 없다(D5).
// input.channels를 넘기면 채널 링크도 통째로 바꾸고, 넘기지 않으면 채널은 그대로 둔다.
export async function saveCreatorProfile(input: ProfileInput): Promise<Ok<{ created: boolean; handle: string }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const { user, sb } = auth;

  const checked = validateCreatorProfile(input);
  if (!checked.ok) {
    const errors: ProfileErrors = checked.errors;
    return { ok: false, error: Object.values(errors)[0] ?? "입력을 확인해 주세요.", fieldErrors: errors };
  }
  const v = checked.value;

  const existing = await sb.from("creator_profiles").select("public_handle").eq("user_id", user.id).maybeSingle();
  if (existing.error) return { ok: false, error: UNAVAILABLE };

  let created = false;
  let handle = v.handle;
  if (existing.data) {
    handle = (existing.data as { public_handle: string }).public_handle;
    if (v.handle !== handle) {
      const msg = "공개 주소는 한 번 정하면 바꿀 수 없어요.";
      return { ok: false, error: msg, fieldErrors: { handle: msg } };
    }
    const upd = await sb
      .from("creator_profiles")
      .update({ roles: v.roles, bio: v.about, open_to_collab: v.openToCollab, is_public: v.isPublic })
      .eq("user_id", user.id)
      .select("user_id");
    if (upd.error || !upd.data?.length) return { ok: false, error: upd.error ? dbMessage(upd.error) : UNAVAILABLE };
  } else {
    const ins = await sb
      .from("creator_profiles")
      .insert({ user_id: user.id, public_handle: v.handle, roles: v.roles, bio: v.about, open_to_collab: v.openToCollab, is_public: v.isPublic });
    if (ins.error) {
      const msg = dbMessage(ins.error);
      return ins.error.code === "23505" ? { ok: false, error: msg, fieldErrors: { handle: msg } } : { ok: false, error: msg };
    }
    created = true;
  }

  if (input.channels !== undefined) {
    const msg = await replaceChannels(sb, v.channels);
    if (msg) return { ok: false, error: `프로필은 저장했지만 채널 링크를 저장하지 못했어요. ${msg}`, fieldErrors: { channels: msg } };
  }
  refresh(handle);
  return { ok: true, created, handle };
}

// 채널 링크만 따로 저장한다(통째로 바꾼다). 프로필이 먼저 있어야 한다.
export async function saveChannels(channels: Channel[]): Promise<Ok<{ count: number }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const checked = validateChannels(Array.isArray(channels) ? channels : []);
  if (!checked.ok) return { ok: false, error: checked.error, fieldErrors: { channels: checked.error } };
  const { data } = await auth.sb.from("creator_profiles").select("public_handle").eq("user_id", auth.user.id).maybeSingle();
  if (!data) return { ok: false, error: "먼저 크리에이터 프로필을 만들어 주세요." };
  const msg = await replaceChannels(auth.sb, checked.value);
  if (msg) return { ok: false, error: msg, fieldErrors: { channels: msg } };
  refresh((data as { public_handle: string }).public_handle);
  return { ok: true, count: checked.value.length };
}

// 프로필 공개·비공개. 비공개로 돌리면 남에게는 프로필과 모든 작품이 보이지 않는다.
export async function setProfilePublic(isPublic: boolean): Promise<Ok<{ isPublic: boolean }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const { data, error } = await auth.sb.from("creator_profiles").update({ is_public: Boolean(isPublic) }).eq("user_id", auth.user.id).select("public_handle");
  if (error) return { ok: false, error: dbMessage(error) };
  if (!data?.length) return { ok: false, error: "먼저 크리에이터 프로필을 만들어 주세요." };
  refresh((data[0] as { public_handle: string }).public_handle);
  return { ok: true, isPublic: Boolean(isPublic) };
}

// ── 작품 ────────────────────────────────────────────────────────────────────────

function workFail(errors: WorkErrors): Fail {
  return { ok: false, error: Object.values(errors)[0] ?? "입력을 확인해 주세요.", fieldErrors: errors };
}

export async function createWork(input: WorkInput): Promise<Ok<{ id: string }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const checked = validateWork(input);
  if (!checked.ok) return workFail(checked.errors);
  const v = checked.value;
  const { data, error } = await auth.sb
    .from("creator_works")
    .insert({ owner_id: auth.user.id, title: v.title, roles: v.roles, genres: v.genres, kind: v.kind, form: v.form, logline: v.logline, plan_id: v.planId })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: dbMessage(error) };
  refresh();
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateWork(workId: string, input: WorkInput): Promise<Ok<{ id: string }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  if (!UUID.test(String(workId))) return { ok: false, error: WORK_NOT_FOUND };
  const checked = validateWork(input);
  if (!checked.ok) return workFail(checked.errors);
  const v = checked.value;
  const { data, error } = await auth.sb
    .from("creator_works")
    .update({ title: v.title, roles: v.roles, genres: v.genres, kind: v.kind, form: v.form, logline: v.logline, plan_id: v.planId })
    .eq("id", workId)
    .eq("owner_id", auth.user.id)
    .select("id");
  if (error) return { ok: false, error: dbMessage(error) };
  if (!data?.length) return { ok: false, error: WORK_NOT_FOUND };
  refresh();
  revalidatePath(`/portfolio/${workId}`);
  return { ok: true, id: workId };
}

// 작품을 지운다. 안의 요소는 DB가 함께 지우고, 올린 파일은 여기서 보관함에서 지운다.
export async function deleteWork(workId: string): Promise<Ok | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  if (!UUID.test(String(workId))) return { ok: false, error: WORK_NOT_FOUND };
  const blocks = await auth.sb.from("creator_work_blocks").select("file_path").eq("work_id", workId).eq("owner_id", auth.user.id);
  if (blocks.error) return { ok: false, error: UNAVAILABLE };
  const { data, error } = await auth.sb.from("creator_works").delete().eq("id", workId).eq("owner_id", auth.user.id).select("id");
  if (error) return { ok: false, error: dbMessage(error) };
  if (!data?.length) return { ok: false, error: WORK_NOT_FOUND };
  await removeOwnFiles(auth.user.id, ((blocks.data ?? []) as { file_path: string | null }[]).map((b) => b.file_path));
  refresh();
  revalidatePath(`/portfolio/${workId}`);
  return { ok: true };
}

// 작품 올리기·내리기. 올리려면 프로필이 있어야 하고(공개 여부와는 별개) 이메일 확인을 마친 계정이어야 한다. 마지막 검사는 DB가 한다.
export async function setWorkPublic(workId: string, isPublic: boolean): Promise<Ok<{ isPublic: boolean }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  if (!UUID.test(String(workId))) return { ok: false, error: WORK_NOT_FOUND };
  const { data, error } = await auth.sb.from("creator_works").update({ is_public: Boolean(isPublic) }).eq("id", workId).eq("owner_id", auth.user.id).select("id");
  if (error) return { ok: false, error: dbMessage(error) };
  if (!data?.length) return { ok: false, error: WORK_NOT_FOUND };
  refresh();
  revalidatePath(`/portfolio/${workId}`);
  return { ok: true, isPublic: Boolean(isPublic) };
}

// ── 작품 안 요소 ─────────────────────────────────────────────────────────────────

async function ownWork(sb: Sb, userId: string, workId: string): Promise<boolean> {
  if (!UUID.test(String(workId))) return false;
  const { data } = await sb.from("creator_works").select("id").eq("id", workId).eq("owner_id", userId).maybeSingle();
  return Boolean(data);
}

async function nextPosition(sb: Sb, workId: string): Promise<number | null> {
  const { data, error } = await sb.from("creator_work_blocks").select("position").eq("work_id", workId).order("position", { ascending: false }).limit(1);
  if (error) return null;
  return data?.length ? (data[0] as { position: number }).position + 1 : 0;
}

async function insertBlock(sb: Sb, userId: string, workId: string, row: Record<string, unknown>): Promise<Ok<{ id: string }> | Fail> {
  const position = await nextPosition(sb, workId);
  if (position === null) return { ok: false, error: UNAVAILABLE };
  const { data, error } = await sb
    .from("creator_work_blocks")
    .insert({ work_id: workId, owner_id: userId, position, ...row })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: dbMessage(error) };
  refresh();
  revalidatePath(`/portfolio/${workId}`);
  return { ok: true, id: (data as { id: string }).id };
}

export async function addTextBlock(workId: string, body: string): Promise<Ok<{ id: string }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const text = validateTextBlock(body);
  if (!text.ok) return { ok: false, error: text.error };
  if (!(await ownWork(auth.sb, auth.user.id, workId))) return { ok: false, error: WORK_NOT_FOUND };
  return insertBlock(auth.sb, auth.user.id, workId, { kind: "text", body: text.value });
}

export async function updateTextBlock(blockId: string, body: string): Promise<Ok | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  if (!UUID.test(String(blockId))) return { ok: false, error: BLOCK_NOT_FOUND };
  const text = validateTextBlock(body);
  if (!text.ok) return { ok: false, error: text.error };
  const { data, error } = await auth.sb
    .from("creator_work_blocks")
    .update({ body: text.value })
    .eq("id", blockId)
    .eq("owner_id", auth.user.id)
    .eq("kind", "text")
    .select("work_id");
  if (error) return { ok: false, error: dbMessage(error) };
  if (!data?.length) return { ok: false, error: BLOCK_NOT_FOUND };
  refresh();
  revalidatePath(`/portfolio/${(data[0] as { work_id: string }).work_id}`);
  return { ok: true };
}

// 유튜브 주소를 붙인다(watch?v=, youtu.be/, shorts/). 영상 파일 직접 올리기는 이번에 하지 않는다(D18).
export async function addVideoBlock(workId: string, url: string): Promise<Ok<{ id: string }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const id = parseYoutubeId(url);
  if (!id) return { ok: false, error: "유튜브 주소(youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…)만 붙일 수 있어요." };
  if (!(await ownWork(auth.sb, auth.user.id, workId))) return { ok: false, error: WORK_NOT_FOUND };
  return insertBlock(auth.sb, auth.user.id, workId, { kind: "video", youtube_id: id });
}

const EXT_OF: Record<string, { kind: FileKind; ext: "jpg" | "png" | "webp" | "pdf" }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "application/pdf": { kind: "document", ext: "pdf" },
};

async function usedBytes(sb: Sb, userId: string): Promise<number | null> {
  const { data, error } = await sb.from("creator_work_blocks").select("file_bytes").eq("owner_id", userId);
  if (error) return null;
  return ((data ?? []) as { file_bytes: number | null }[]).reduce((n, r) => n + (r.file_bytes ?? 0), 0);
}

async function blockCount(sb: Sb, workId: string): Promise<number | null> {
  const { count, error } = await sb.from("creator_work_blocks").select("id", { count: "exact", head: true }).eq("work_id", workId);
  return error ? null : (count ?? 0);
}

// 파일 올리기 1단계: 올리려는 파일(종류·크기)이 규칙에 맞는지 먼저 보고, 맞으면 브라우저가 보관함에 직접 올릴 1회용 자리를 준다.
// (요청 크기 한도 4.5MB 때문에 5MB 이미지·10MB PDF는 서버 동작으로 받을 수 없다.) 올린 뒤에 finishFileUpload를 불러야 요소가 만들어진다.
export async function prepareFileUpload(
  workId: string,
  file: { kind: FileKind; type: string; size: number },
): Promise<Ok<{ path: string; token: string }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const spec = EXT_OF[String(file?.type)];
  if (!spec || spec.kind !== file?.kind) {
    return { ok: false, error: file?.kind === "document" ? "PDF 파일만 올릴 수 있어요." : "JPG, PNG, WEBP 이미지만 올릴 수 있어요." };
  }
  const size = Number(file.size);
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: "비어 있는 파일은 올릴 수 없어요." };
  if (size > maxBytesOf(spec.kind)) return { ok: false, error: spec.kind === "image" ? "이미지는 한 장에 5MB 이하여야 해요." : "PDF는 한 개에 10MB 이하여야 해요." };
  if (!(await ownWork(auth.sb, auth.user.id, workId))) return { ok: false, error: WORK_NOT_FOUND };

  const [count, used] = await Promise.all([blockCount(auth.sb, workId), usedBytes(auth.sb, auth.user.id)]);
  if (count === null || used === null) return { ok: false, error: UNAVAILABLE };
  if (count >= BLOCK_LIMIT) return { ok: false, error: `한 작품에는 요소를 ${BLOCK_LIMIT}개까지 넣을 수 있어요.` };
  if (used + size > QUOTA_BYTES) return { ok: false, error: "올린 파일이 합쳐서 20MB를 넘어요. 안 쓰는 파일을 지운 뒤 다시 시도해 주세요." };

  let slot: Awaited<ReturnType<typeof createUploadSlot>>;
  try {
    slot = await createUploadSlot(auth.user.id, spec.ext);
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
  if (!slot) return { ok: false, error: UNAVAILABLE };
  return { ok: true, path: slot.path, token: slot.token };
}

const cleanFileName = (n: string) => String(n ?? "").replace(/[\u0000-\u001f\u007f<>/\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 200);

// 파일 올리기 2단계: 보관함에 올라온 파일을 서버가 직접 읽어 크기·파일 앞 글자·용량을 다시 검사하고, 통과하면 요소를 만든다.
// 통과하지 못하면 올라온 파일을 지운다. 이 사람에게 발급한 자리(파일 이름 표식)가 아니면 아무것도 하지 않는다.
export async function finishFileUpload(workId: string, upload: { path: string; kind: FileKind; name: string }): Promise<Ok<{ id: string }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const { user, sb } = auth;
  const path = String(upload?.path ?? "");
  const kind: FileKind = upload?.kind === "document" ? "document" : "image";
  if (!fileBelongsTo(user.id, path)) return { ok: false, error: "올린 파일을 찾을 수 없어요. 다시 올려 주세요." };

  const fail = async (error: string): Promise<Fail> => {
    await removeOwnFiles(user.id, [path]);
    return { ok: false, error };
  };

  if (!(await ownWork(sb, user.id, workId))) return fail(WORK_NOT_FOUND);
  // 같은 파일로 요소를 두 번 만들면 하나를 지울 때 다른 하나의 파일이 사라진다. 이미 쓰고 있는 파일이면 거절한다(파일은 지우지 않는다).
  const used = await sb.from("creator_work_blocks").select("id").eq("owner_id", user.id).eq("file_path", path).limit(1);
  if (used.error) return fail(UNAVAILABLE);
  if (used.data?.length) return { ok: false, error: "이미 요소로 만든 파일이에요." };

  const looked = await inspectUploaded(user.id, path, kind);
  if (!looked.ok) return fail(looked.error);
  if (!path.endsWith(`.${looked.sniffed.ext}`)) return fail("파일 내용과 형식이 맞지 않아요.");

  const [count, usedTotal] = await Promise.all([blockCount(sb, workId), usedBytes(sb, user.id)]);
  if (count === null || usedTotal === null) return fail(UNAVAILABLE);
  if (count >= BLOCK_LIMIT) return fail(`한 작품에는 요소를 ${BLOCK_LIMIT}개까지 넣을 수 있어요.`);
  if (usedTotal + looked.size > QUOTA_BYTES) return fail("올린 파일이 합쳐서 20MB를 넘어요. 안 쓰는 파일을 지운 뒤 다시 시도해 주세요.");

  const res = await insertBlock(sb, user.id, workId, {
    kind,
    file_path: path,
    file_name: cleanFileName(upload.name) || null,
    file_bytes: looked.size,
  });
  if (!res.ok) await removeOwnFiles(user.id, [path]);
  return res;
}

// 요소를 지운다. 올린 파일이 있으면 보관함에서도 지운다.
export async function deleteBlock(blockId: string): Promise<Ok | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  if (!UUID.test(String(blockId))) return { ok: false, error: BLOCK_NOT_FOUND };
  const { data, error } = await auth.sb.from("creator_work_blocks").delete().eq("id", blockId).eq("owner_id", auth.user.id).select("work_id, file_path");
  if (error) return { ok: false, error: dbMessage(error) };
  if (!data?.length) return { ok: false, error: BLOCK_NOT_FOUND };
  const row = data[0] as { work_id: string; file_path: string | null };
  await removeOwnFiles(auth.user.id, [row.file_path]);
  refresh();
  revalidatePath(`/portfolio/${row.work_id}`);
  return { ok: true };
}

// 요소 한 칸 위·아래로 옮기기
export async function moveBlock(blockId: string, direction: "up" | "down"): Promise<Ok | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  if (!UUID.test(String(blockId)) || (direction !== "up" && direction !== "down")) return { ok: false, error: BLOCK_NOT_FOUND };
  const one = await auth.sb.from("creator_work_blocks").select("work_id").eq("id", blockId).eq("owner_id", auth.user.id).maybeSingle();
  if (!one.data) return { ok: false, error: BLOCK_NOT_FOUND };
  const workId = (one.data as { work_id: string }).work_id;
  const all = await auth.sb.from("creator_work_blocks").select("id").eq("work_id", workId).eq("owner_id", auth.user.id).order("position", { ascending: true }).order("created_at", { ascending: true });
  if (all.error) return { ok: false, error: UNAVAILABLE };
  const ids = ((all.data ?? []) as { id: string }[]).map((r) => r.id);
  const i = ids.indexOf(blockId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true }; // 이미 맨 위·맨 아래
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return writeOrder(auth.sb, auth.user.id, workId, ids);
}

// 요소 순서를 통째로 정한다(끌어서 옮기기). 작품 안의 모든 요소 번호를 원하는 순서대로 한 번씩 넘겨야 한다.
export async function reorderBlocks(workId: string, orderedIds: string[]): Promise<Ok | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  if (!UUID.test(String(workId)) || !Array.isArray(orderedIds)) return { ok: false, error: WORK_NOT_FOUND };
  const all = await auth.sb.from("creator_work_blocks").select("id").eq("work_id", workId).eq("owner_id", auth.user.id);
  if (all.error) return { ok: false, error: UNAVAILABLE };
  const have = new Set(((all.data ?? []) as { id: string }[]).map((r) => r.id));
  const want = orderedIds.map(String);
  if (want.length !== have.size || new Set(want).size !== want.length || !want.every((id) => have.has(id))) {
    return { ok: false, error: "요소 목록이 바뀌었어요. 새로고침한 뒤 다시 옮겨 주세요." };
  }
  return writeOrder(auth.sb, auth.user.id, workId, want);
}

async function writeOrder(sb: Sb, userId: string, workId: string, ids: string[]): Promise<Ok | Fail> {
  const results = await Promise.all(ids.map((id, position) => sb.from("creator_work_blocks").update({ position }).eq("id", id).eq("owner_id", userId)));
  if (results.some((r) => r.error)) return { ok: false, error: UNAVAILABLE };
  refresh();
  revalidatePath(`/portfolio/${workId}`);
  return { ok: true };
}

// ── 기획안 화면의 「포트폴리오에 올리기」 (D29·D32·D13) ───────────────────────────────────────
// 기획안은 작품 안에서만 공개된다. 순서: (프로필이 없으면 공개 주소·역할만으로 프로필 만들기) → 그 기획안이 붙은 작품 만들기·갱신(비공개) →
// 기획안 공개 → 작품 공개. 프로필 공개 여부는 화면이 먼저 묻고 profilePublic으로 넘긴다(어느 쪽을 골라도 작품은 올라간다).
export async function publishPlanAsWork(
  planId: string,
  draft: unknown,
  opts: { profile?: { handle: string; roles: string[] }; profilePublic?: boolean },
): Promise<Ok<{ workId: string; handle: string; panel: PlanPanel | null }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const { user, sb } = auth;
  if (!UUID.test(String(planId))) return { ok: false, error: "찾을 수 없는 기획안이에요." };

  // 내 기획안만
  const plan = await sb.from("plans").select("id").eq("id", planId).eq("owner_id", user.id).maybeSingle();
  if (plan.error) return { ok: false, error: UNAVAILABLE };
  if (!plan.data) return { ok: false, error: "찾을 수 없는 기획안이에요." };

  // 프로필
  const existing = await sb.from("creator_profiles").select("public_handle, roles, is_public").eq("user_id", user.id).maybeSingle();
  if (existing.error) return { ok: false, error: UNAVAILABLE };
  let handle: string;
  let roles: string[];
  if (existing.data) {
    const row = existing.data as { public_handle: string; roles: string[]; is_public: boolean };
    handle = row.public_handle;
    roles = row.roles;
    if (opts.profilePublic === true && !row.is_public) {
      const upd = await sb.from("creator_profiles").update({ is_public: true }).eq("user_id", user.id);
      if (upd.error) return { ok: false, error: dbMessage(upd.error) };
    }
  } else {
    const checked = validateCreatorProfile({ handle: opts.profile?.handle ?? "", roles: opts.profile?.roles ?? [], isPublic: opts.profilePublic === true });
    if (!checked.ok) {
      const errors: ProfileErrors = checked.errors;
      return { ok: false, error: Object.values(errors)[0] ?? "공개 주소와 역할을 확인해 주세요.", fieldErrors: errors };
    }
    const ins = await sb.from("creator_profiles").insert({ user_id: user.id, public_handle: checked.value.handle, roles: checked.value.roles, bio: "", open_to_collab: true, is_public: checked.value.isPublic });
    if (ins.error) {
      const msg = dbMessage(ins.error);
      return ins.error.code === "23505" ? { ok: false, error: msg, fieldErrors: { handle: msg } } : { ok: false, error: msg };
    }
    handle = checked.value.handle;
    roles = checked.value.roles;
  }

  // 이 기획안이 붙은 작품(있으면 갱신, 없으면 새로 만든다). 제목·로그라인은 기획안에서 가져온다.
  const parsed = parseDraft(draft);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const title = titleOrDefault(parsed.draft.title, parsed.draft).slice(0, 60) || "제목 없는 작품";
  const logline = loglineText(parsed.draft).trim();
  const lw = validateWork({ title, roles, logline, planId });
  if (!lw.ok) return workFail(lw.errors);

  const found = await sb.from("creator_works").select("id").eq("owner_id", user.id).eq("plan_id", planId).maybeSingle();
  if (found.error) return { ok: false, error: UNAVAILABLE };
  let workId: string;
  if (found.data) {
    workId = (found.data as { id: string }).id;
    const upd = await sb.from("creator_works").update({ title: lw.value.title, logline: lw.value.logline }).eq("id", workId).eq("owner_id", user.id).select("id");
    if (upd.error || !upd.data?.length) return { ok: false, error: upd.error ? dbMessage(upd.error) : WORK_NOT_FOUND };
  } else {
    const ins = await sb
      .from("creator_works")
      .insert({ owner_id: user.id, title: lw.value.title, roles: lw.value.roles, genres: [], logline: lw.value.logline, plan_id: planId })
      .select("id")
      .single();
    if (ins.error || !ins.data) return { ok: false, error: dbMessage(ins.error) };
    workId = (ins.data as { id: string }).id;
  }

  // 기획안 공개(공개용 사본 저장) → 작품 공개
  const pub = await setPlanPublic(planId, true, draft);
  if (!pub.ok) return { ok: false, error: pub.error };
  const up = await sb.from("creator_works").update({ is_public: true }).eq("id", workId).eq("owner_id", user.id).select("id");
  if (up.error || !up.data?.length) {
    await setPlanPublic(planId, false, draft);
    return { ok: false, error: up.error ? dbMessage(up.error) : WORK_NOT_FOUND };
  }
  refresh(handle);
  revalidatePath(`/portfolio/${workId}`);
  return { ok: true, workId, handle, panel: pub.panel };
}

// 기획안 화면의 「포트폴리오에서 내리기」: 그 기획안이 붙은 작품을 내리고(DB가 기획안도 함께 비공개로 돌린다), 공개용 사본도 지운다.
export async function unpublishPlanWork(planId: string): Promise<Ok<{ panel: PlanPanel | null }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  if (!UUID.test(String(planId))) return { ok: false, error: "찾을 수 없는 기획안이에요." };
  const w = await auth.sb.from("creator_works").update({ is_public: false }).eq("owner_id", auth.user.id).eq("plan_id", planId).select("id");
  if (w.error) return { ok: false, error: dbMessage(w.error) };
  const r = await setPlanPublic(planId, false, null);
  if (!r.ok) return { ok: false, error: r.error };
  refresh();
  for (const row of (w.data ?? []) as { id: string }[]) revalidatePath(`/portfolio/${row.id}`);
  return { ok: true, panel: r.panel };
}
