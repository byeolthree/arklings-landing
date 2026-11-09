"use server";

// 크리에이터 프로필·채널 링크·작품·작품 안 요소를 만들고 고치고 지우는 Server Action 모음.
// 모든 동작은 맨 위에서 로그인과 이메일 확인을 다시 하고(화면에서 막았더라도 이 입구는 따로 열려 있다),
// 로그인한 본인 연결(createAuthClient)로 실행한다. 그래서 DB 규칙(RLS와 0009의 검사)이 한 번 더 막는다.
// 서버 전용 열쇠는 파일 올리기·지우기·임시 주소(lib/creator-files.ts)에서만 쓰이고, 그 전에 여기서 권한을 먼저 확인한다.
import { revalidatePath } from "next/cache";
import { CONFIRM_FIRST_MESSAGE, getCurrentUser, isConfirmed, type CurrentUser } from "@/lib/auth";
import {
  BLOCK_LIMIT,
  LOGLINE_TOKEN,
  QUOTA_BYTES,
  parseSubKind,
  type BlockKind,
  parseYoutubeId,
  validateCreatorProfile,
  validateChannels,
  validateHandle,
  validateTextBlock,
  validateWork,
  normalizeHandle,
  type Channel,
  type FileKind,
  type HeroFileKind,
  type ProfileErrors,
  type ProfileInput,
  type WorkErrors,
  type WorkInput,
} from "@/lib/creator-rules";
import { createUploadSlot, fileBelongsTo, inspectUploaded, inspectUploadedHero, maxBytesOf, maxHeroBytes, removeOwnFiles } from "@/lib/creator-files";
import { createAuthClient } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";
import { loglineText, parseDraft, titleOrDefault } from "@/lib/plans";

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
  if (m.includes("logline_position")) return "로그라인 위치를 저장하려면 데이터베이스 준비(0013)가 먼저 필요해요. 로그라인을 맨 위에 두고 저장하거나 잠시 뒤에 다시 시도해 주세요.";
  if (m.includes("creator_work_blocks_shape") || m.includes("creator_work_blocks_file_path")) return "영상 파일을 저장하려면 데이터베이스 준비(0015)가 먼저 필요해요. 유튜브 주소로 넣거나 잠시 뒤에 다시 시도해 주세요.";
  if (m.includes("creator_work_blocks_sub_kind")) return "고를 수 없는 종류예요.";
  if (m.includes("sub_kind")) return "요소 종류를 저장하려면 데이터베이스 준비(0012)가 먼저 필요해요. 종류를 비우고 저장하거나 잠시 뒤에 다시 시도해 주세요.";
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

// 작품 카드의 순서를 저장한다(마이페이지 목록·프로필의 손잡이). 내 작품 전체의 번호를 원하는 순서대로 받아 sort_order를 0부터 매긴다.
// 번호가 하나라도 빠지거나 남의 것이 섞여 있으면 저장하지 않는다. 바뀐 작품만 고쳐서 수정일이 괜히 바뀌지 않게 한다.
export async function reorderWorks(orderedIds: string[]): Promise<Ok | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  if (!Array.isArray(orderedIds) || orderedIds.length === 0 || orderedIds.length > 12 || !orderedIds.every((id) => UUID.test(String(id))) || new Set(orderedIds).size !== orderedIds.length) {
    return { ok: false, error: "작품 순서를 저장하지 못했어요. 새로고침한 뒤 다시 시도해 주세요." };
  }
  const own = await auth.sb.from("creator_works").select("id, sort_order").eq("owner_id", auth.user.id);
  if (own.error) return { ok: false, error: UNAVAILABLE };
  const rows = (own.data ?? []) as { id: string; sort_order: number }[];
  if (rows.length !== orderedIds.length || !rows.every((r) => orderedIds.includes(r.id))) {
    return { ok: false, error: "작품 목록이 바뀌었어요. 새로고침한 뒤 다시 시도해 주세요." };
  }
  const before = new Map(rows.map((r) => [r.id, r.sort_order]));
  for (let i = 0; i < orderedIds.length; i += 1) {
    if (before.get(orderedIds[i]) === i) continue;
    const { error } = await auth.sb.from("creator_works").update({ sort_order: i }).eq("id", orderedIds[i]).eq("owner_id", auth.user.id);
    if (error) return { ok: false, error: dbMessage(error) };
  }
  refresh();
  return { ok: true };
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

const SUBKIND_BAD = "고를 수 없는 종류예요.";

// subKind는 선택(0012 이후): 글(문서) 요소의 세부 종류. 목록에 없는 글자는 거절한다.
export async function addTextBlock(workId: string, body: string, subKind?: string | null): Promise<Ok<{ id: string }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const text = validateTextBlock(body);
  if (!text.ok) return { ok: false, error: text.error };
  const sub = parseSubKind("text", subKind);
  if (sub === undefined) return { ok: false, error: SUBKIND_BAD };
  if (!(await ownWork(auth.sb, auth.user.id, workId))) return { ok: false, error: WORK_NOT_FOUND };
  return insertBlock(auth.sb, auth.user.id, workId, { kind: "text", body: text.value, ...(sub ? { sub_kind: sub } : {}) });
}

// 요소의 세부 종류를 고치거나(subKind=null이면 비움) 처음 정한다. 이미지 요소에는 세부 종류가 없다.
export async function setBlockSubKind(blockId: string, subKind: string | null): Promise<Ok | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  if (!UUID.test(String(blockId))) return { ok: false, error: BLOCK_NOT_FOUND };
  const row = await auth.sb.from("creator_work_blocks").select("kind, work_id").eq("id", blockId).eq("owner_id", auth.user.id).maybeSingle();
  if (row.error) return { ok: false, error: UNAVAILABLE };
  if (!row.data) return { ok: false, error: BLOCK_NOT_FOUND };
  const { kind, work_id } = row.data as { kind: BlockKind; work_id: string };
  const sub = parseSubKind(kind, subKind);
  if (sub === undefined) return { ok: false, error: SUBKIND_BAD };
  const { error } = await auth.sb.from("creator_work_blocks").update({ sub_kind: sub }).eq("id", blockId).eq("owner_id", auth.user.id);
  if (error) return { ok: false, error: dbMessage(error) };
  refresh();
  revalidatePath(`/portfolio/${work_id}`);
  return { ok: true };
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
export async function addVideoBlock(workId: string, url: string, subKind?: string | null): Promise<Ok<{ id: string }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const sub = parseSubKind("video", subKind);
  if (sub === undefined) return { ok: false, error: SUBKIND_BAD };
  const id = parseYoutubeId(url);
  if (!id) return { ok: false, error: "유튜브 주소(youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…)만 붙일 수 있어요." };
  if (!(await ownWork(auth.sb, auth.user.id, workId))) return { ok: false, error: WORK_NOT_FOUND };
  return insertBlock(auth.sb, auth.user.id, workId, { kind: "video", youtube_id: id, ...(sub ? { sub_kind: sub } : {}) });
}

const EXT_OF: Record<string, { kind: FileKind; ext: "jpg" | "png" | "webp" | "pdf" | "mp4" }> = {
  "video/mp4": { kind: "video", ext: "mp4" },
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "application/pdf": { kind: "document", ext: "pdf" },
};

// 작품 요소 파일(이미지·PDF)의 합계
async function blocksBytes(sb: Sb, userId: string): Promise<number | null> {
  const { data, error } = await sb.from("creator_work_blocks").select("file_bytes").eq("owner_id", userId);
  if (error) return null;
  return ((data ?? []) as { file_bytes: number | null }[]).reduce((n, r) => n + (r.file_bytes ?? 0), 0);
}

// 프로필 대표 이미지·영상의 크기(없으면 0)
async function heroBytes(sb: Sb, userId: string): Promise<number | null> {
  const { data, error } = await sb.from("creator_profiles").select("hero_bytes").eq("user_id", userId).maybeSingle();
  if (error) return null;
  return (data as { hero_bytes: number | null } | null)?.hero_bytes ?? 0;
}

// 사람당 파일 합계(20MB)에 세는 양: 작품 요소 파일 + 프로필 대표 파일(별뜨리님 지시 2026-11-09).
async function usedBytes(sb: Sb, userId: string): Promise<number | null> {
  const [a, b] = await Promise.all([blocksBytes(sb, userId), heroBytes(sb, userId)]);
  return a === null || b === null ? null : a + b;
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
    return { ok: false, error: file?.kind === "document" ? "PDF 파일만 올릴 수 있어요." : file?.kind === "video" ? "MP4 파일만 올릴 수 있어요." : "JPG, PNG, WEBP 이미지만 올릴 수 있어요." };
  }
  const size = Number(file.size);
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: "비어 있는 파일은 올릴 수 없어요." };
  if (size > maxBytesOf(spec.kind)) return { ok: false, error: spec.kind === "image" ? "이미지는 한 장에 5MB 이하여야 해요." : spec.kind === "video" ? "영상은 10MB 이하여야 해요." : "PDF는 한 개에 10MB 이하여야 해요." };
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
export async function finishFileUpload(workId: string, upload: { path: string; kind: FileKind; name: string; subKind?: string | null }): Promise<Ok<{ id: string }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const { user, sb } = auth;
  const path = String(upload?.path ?? "");
  const kind: FileKind = upload?.kind === "document" ? "document" : upload?.kind === "video" ? "video" : "image";
  if (!fileBelongsTo(user.id, path)) return { ok: false, error: "올린 파일을 찾을 수 없어요. 다시 올려 주세요." };

  const fail = async (error: string): Promise<Fail> => {
    await removeOwnFiles(user.id, [path]);
    return { ok: false, error };
  };
  const sub = parseSubKind(kind === "document" ? "document" : kind === "video" ? "video" : "image", upload?.subKind);
  if (sub === undefined) return fail(SUBKIND_BAD);

  if (!(await ownWork(sb, user.id, workId))) return fail(WORK_NOT_FOUND);
  // 같은 파일로 요소를 두 번 만들면 하나를 지울 때 다른 하나의 파일이 사라진다. 이미 쓰고 있는 파일이면 거절한다(파일은 지우지 않는다).
  const [used, asHero] = await Promise.all([
    sb.from("creator_work_blocks").select("id").eq("owner_id", user.id).eq("file_path", path).limit(1),
    sb.from("creator_profiles").select("user_id").eq("user_id", user.id).eq("hero_path", path).limit(1),
  ]);
  if (used.error || asHero.error) return fail(UNAVAILABLE);
  if (used.data?.length) return { ok: false, error: "이미 요소로 만든 파일이에요." };
  if (asHero.data?.length) return { ok: false, error: "이미 대표 파일로 쓰고 있는 파일이에요." };

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
    ...(sub ? { sub_kind: sub } : {}),
  });
  if (!res.ok) await removeOwnFiles(user.id, [path]);
  return res;
}

// 작품 안의 로그라인 블록과 요소를 한꺼번에 원하는 순서로 저장한다(D35-2). items에는 이 작품의 요소 번호 전부와 글자 「logline」 하나가 들어 있어야 한다.
// 로그라인 위치(logline_position)는 로그라인 앞에 있는 요소의 개수로 저장하고, 요소는 로그라인을 뺀 순서대로 position을 다시 매긴다. 맨 위에 놓인 것이 작품의 「대표」다.
export async function reorderWorkItems(workId: string, items: string[]): Promise<Ok | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  if (!UUID.test(String(workId)) || !Array.isArray(items)) return { ok: false, error: WORK_NOT_FOUND };
  const want = items.map(String);
  if (want.filter((x) => x === LOGLINE_TOKEN).length !== 1 || want.length > BLOCK_LIMIT + 1) return { ok: false, error: "요소 목록이 바뀌었어요. 새로고침한 뒤 다시 옮겨 주세요." };
  const blockIds = want.filter((x) => x !== LOGLINE_TOKEN);
  if (new Set(blockIds).size !== blockIds.length) return { ok: false, error: "요소 목록이 바뀌었어요. 새로고침한 뒤 다시 옮겨 주세요." };
  if (!(await ownWork(auth.sb, auth.user.id, workId))) return { ok: false, error: WORK_NOT_FOUND };
  const all = await auth.sb.from("creator_work_blocks").select("id").eq("work_id", workId).eq("owner_id", auth.user.id);
  if (all.error) return { ok: false, error: UNAVAILABLE };
  const have = new Set(((all.data ?? []) as { id: string }[]).map((r) => r.id));
  if (blockIds.length !== have.size || !blockIds.every((id) => have.has(id))) return { ok: false, error: "요소 목록이 바뀌었어요. 새로고침한 뒤 다시 옮겨 주세요." };
  // 로그라인 위치를 먼저 저장한다(이 칸이 아직 없으면 여기서 멈춰 아무것도 바뀌지 않는다).
  const pos = want.indexOf(LOGLINE_TOKEN);
  const w = await auth.sb.from("creator_works").update({ logline_position: pos }).eq("id", workId).eq("owner_id", auth.user.id).select("id");
  if (w.error) return { ok: false, error: dbMessage(w.error) };
  if (!w.data?.length) return { ok: false, error: WORK_NOT_FOUND };
  return writeOrder(auth.sb, auth.user.id, workId, blockIds);
}

// ── 프로필 대표 이미지·영상 올리기(0-4 v) ──────────────────────────────────────────
// 작품 파일과 같은 순서다: ① prepareHeroUpload가 규칙(로그인·이메일 확인·프로필·형식·크기·합계 20MB)을 먼저 보고 1회용 올리기 자리를 준다
// ② 브라우저가 보관함에 직접 올린다(요청 크기 한도 4.5MB를 피함) ③ finishHeroUpload가 올라온 실제 파일을 다시 검사해 프로필에 건다(안 맞으면 파일을 지운다).
const HERO_EXT: Record<string, { kind: HeroFileKind; ext: "jpg" | "png" | "webp" | "mp4" }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "video/mp4": { kind: "video", ext: "mp4" },
};
const HERO_NEED_PROFILE = "먼저 위에서 프로필을 만든 뒤에 대표 이미지·영상을 올릴 수 있어요.";
const HERO_QUOTA_MESSAGE = "올린 파일이 합쳐서 20MB를 넘어요. 안 쓰는 파일을 지운 뒤 다시 시도해 주세요.";

export async function prepareHeroUpload(file: { kind: HeroFileKind; type: string; size: number }): Promise<Ok<{ path: string; token: string }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const spec = HERO_EXT[String(file?.type)];
  if (!spec || spec.kind !== file?.kind) {
    return { ok: false, error: file?.kind === "video" ? "MP4 파일만 올릴 수 있어요." : "JPG, PNG, WEBP 파일만 올릴 수 있어요." };
  }
  const size = Number(file.size);
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: "비어 있는 파일은 올릴 수 없어요." };
  if (size > maxHeroBytes(spec.kind)) return { ok: false, error: spec.kind === "image" ? "이미지는 5MB 이하여야 해요." : "영상은 10MB 이하여야 해요." };
  const prof = await auth.sb.from("creator_profiles").select("user_id").eq("user_id", auth.user.id).maybeSingle();
  if (prof.error) return { ok: false, error: UNAVAILABLE };
  if (!prof.data) return { ok: false, error: HERO_NEED_PROFILE };
  // 새 대표 파일은 지금 걸린 대표 파일을 대신하므로, 합계는 작품 요소 파일만 센 값에 새 파일을 더해 본다.
  const blocks = await blocksBytes(auth.sb, auth.user.id);
  if (blocks === null) return { ok: false, error: UNAVAILABLE };
  if (blocks + size > QUOTA_BYTES) return { ok: false, error: HERO_QUOTA_MESSAGE };
  let slot: Awaited<ReturnType<typeof createUploadSlot>>;
  try {
    slot = await createUploadSlot(auth.user.id, spec.ext);
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
  if (!slot) return { ok: false, error: UNAVAILABLE };
  return { ok: true, path: slot.path, token: slot.token };
}

export async function finishHeroUpload(upload: { path: string; kind: HeroFileKind; name?: string }): Promise<Ok<{ kind: HeroFileKind }> | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const { user, sb } = auth;
  const path = String(upload?.path ?? "");
  const kind: HeroFileKind = upload?.kind === "video" ? "video" : "image";
  if (!fileBelongsTo(user.id, path)) return { ok: false, error: "올린 파일을 찾을 수 없어요. 다시 올려 주세요." };
  const fail = async (error: string): Promise<Fail> => {
    await removeOwnFiles(user.id, [path]);
    return { ok: false, error };
  };

  const prof = await sb.from("creator_profiles").select("public_handle, hero_path").eq("user_id", user.id).maybeSingle();
  if (prof.error) return fail(UNAVAILABLE);
  if (!prof.data) return fail(HERO_NEED_PROFILE);
  const { public_handle, hero_path } = prof.data as { public_handle: string; hero_path: string | null };
  if (hero_path === path) return { ok: false, error: "이미 대표로 걸린 파일이에요." };
  // 같은 파일을 작품 요소로도 쓰고 있으면 하나를 지울 때 다른 하나의 파일이 사라진다. 이미 쓰는 파일이면 거절한다(파일은 지우지 않는다).
  const used = await sb.from("creator_work_blocks").select("id").eq("owner_id", user.id).eq("file_path", path).limit(1);
  if (used.error) return fail(UNAVAILABLE);
  if (used.data?.length) return { ok: false, error: "이미 쓰고 있는 파일이에요." };

  const looked = await inspectUploadedHero(user.id, path, kind);
  if (!looked.ok) return fail(looked.error);
  if (!path.endsWith(`.${looked.sniffed.ext}`)) return fail("파일 내용과 형식이 맞지 않아요.");

  const blocks = await blocksBytes(sb, user.id);
  if (blocks === null) return fail(UNAVAILABLE);
  if (blocks + looked.size > QUOTA_BYTES) return fail(HERO_QUOTA_MESSAGE);

  const upd = await sb.from("creator_profiles").update({ hero_kind: kind, hero_path: path, hero_bytes: looked.size }).eq("user_id", user.id).select("user_id");
  if (upd.error) return fail(dbMessage(upd.error));
  if (!upd.data?.length) return fail(UNAVAILABLE);
  await removeOwnFiles(user.id, [hero_path]); // 바꾼 것이면 이전 대표 파일은 지운다
  refresh(public_handle);
  return { ok: true, kind };
}

export async function removeHero(): Promise<Ok | Fail> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const { user, sb } = auth;
  const prof = await sb.from("creator_profiles").select("public_handle, hero_path").eq("user_id", user.id).maybeSingle();
  if (prof.error) return { ok: false, error: UNAVAILABLE };
  if (!prof.data) return { ok: false, error: HERO_NEED_PROFILE };
  const { public_handle, hero_path } = prof.data as { public_handle: string; hero_path: string | null };
  const upd = await sb.from("creator_profiles").update({ hero_kind: null, hero_path: null, hero_bytes: null }).eq("user_id", user.id).select("user_id");
  if (upd.error) return { ok: false, error: dbMessage(upd.error) };
  await removeOwnFiles(user.id, [hero_path]);
  refresh(public_handle);
  return { ok: true };
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

// ── 기획안 화면의 「포트폴리오 작성하기」 (D29·D32) ───────────────────────────────────────
// 기획안 화면에서 바로 올리지 않는다. 그 기획안이 붙은 작품(비공개)을 만들어 두고, 화면은 마이페이지의 포트폴리오 등록으로 넘어가
// 역할·장르·글·이미지를 마저 쓴 뒤 거기서 올리게 한다. 이미 그 기획안의 작품이 있으면 그 작품 번호만 돌려준다(고쳐 둔 내용을 덮지 않는다).
// 작품 역할은 기획안이 글이라 「대본」을 먼저 골라 둔다(마이페이지에서 바꿀 수 있다). 프로필이 없으면 작품을 만들지 않고 needProfile을 돌려준다.
export async function startWorkFromPlan(
  planId: string,
  draft: unknown,
): Promise<Ok<{ workId: string }> | (Fail & { needProfile?: true })> {
  const auth = await needUser();
  if (!("user" in auth)) return auth;
  const { user, sb } = auth;
  if (!UUID.test(String(planId))) return { ok: false, error: "찾을 수 없는 기획안이에요." };

  const plan = await sb.from("plans").select("id").eq("id", planId).eq("owner_id", user.id).maybeSingle();
  if (plan.error) return { ok: false, error: UNAVAILABLE };
  if (!plan.data) return { ok: false, error: "찾을 수 없는 기획안이에요." };

  const found = await sb.from("creator_works").select("id").eq("owner_id", user.id).eq("plan_id", planId).maybeSingle();
  if (found.error) return { ok: false, error: UNAVAILABLE };
  if (found.data) return { ok: true, workId: (found.data as { id: string }).id };

  const profile = await sb.from("creator_profiles").select("public_handle").eq("user_id", user.id).maybeSingle();
  if (profile.error) return { ok: false, error: UNAVAILABLE };
  if (!profile.data) return { ok: false, error: "작품을 만들려면 먼저 크리에이터 프로필을 만들어 주세요.", needProfile: true };

  const parsed = parseDraft(draft);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const title = titleOrDefault(parsed.draft.title, parsed.draft).slice(0, 60) || "제목 없는 작품";
  const lw = validateWork({ title, roles: ["script"], logline: loglineText(parsed.draft).trim(), planId });
  if (!lw.ok) return workFail(lw.errors);
  const ins = await sb
    .from("creator_works")
    .insert({ owner_id: user.id, title: lw.value.title, roles: lw.value.roles, genres: [], logline: lw.value.logline, plan_id: planId })
    .select("id")
    .single();
  if (ins.error || !ins.data) return { ok: false, error: dbMessage(ins.error) };
  refresh();
  return { ok: true, workId: (ins.data as { id: string }).id };
}
