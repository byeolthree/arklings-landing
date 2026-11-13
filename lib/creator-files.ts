// 크리에이터 작품 파일(이미지·PDF)의 서버 쪽 처리: 파일 앞 글자 검사, 올릴 자리 만들기, 짧은 임시 주소, 지우기.
// 비공개 보관함(creator-works)에는 읽기·쓰기 정책이 없어서 서버 전용 열쇠(createAdminClient)로만 다룬다.
// 이 열쇠는 이 파일에서만 쓰고, 쓰기 전에 항상 "이 사람이 해도 되는 일인지"를 먼저 확인한다.
//   · 올릴 자리: 호출하는 쪽(Server Action)이 로그인·이메일 확인·작품 주인 확인을 마친 뒤에만 부른다.
//   · 임시 주소: 공개용 보기(view)에 실제로 있는 파일(=공개 프로필의 공개 작품 파일)만, 또는 본인 표식이 붙은 본인 파일만 만든다.
//   · 지우기: 본인 표식이 붙은 파일만 지운다.
// 파일 이름은 "임의 글자 20자-표식 15자"(36자, 0009의 경로 검사와 같은 모양)다. 표식은 (서버 비밀값, 주인 번호, 임의 글자)로 만든 서명이라
// 다른 사람의 파일 이름을 자기 요소에 적어 넣어도(DB는 이름 모양만 본다) 서버가 그 파일을 지우거나 본인 것처럼 보여 주지 않는다.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { DOCUMENT_MAX_BYTES, HERO_VIDEO_MAX_BYTES, IMAGE_MAX_BYTES, type FileKind, type HeroFileKind } from "@/lib/creator-rules";
import { getSupabase } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase/admin";

export const CREATOR_BUCKET = "creator-works";
export const SIGNED_URL_SECONDS = 600; // 임시 주소 유효 시간(10분)

type Sniffed = { kind: FileKind; type: "image/jpeg" | "image/png" | "image/webp" | "application/pdf" | "video/mp4"; ext: "jpg" | "png" | "webp" | "pdf" | "mp4" };

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  return sig.every((b, i) => bytes[offset + i] === b);
}

// 파일 맨 앞 글자(시그니처)로 실제 종류를 알아낸다. 브라우저가 알려 주는 형식은 속일 수 있으므로 믿지 않는다(lib/collab-file.ts와 같은 방식).
export function sniffFile(head: Uint8Array): Sniffed | null {
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { kind: "document", type: "application/pdf", ext: "pdf" }; // %PDF-
  if (startsWith(head, [0x66, 0x74, 0x79, 0x70], 4)) return { kind: "video", type: "video/mp4", ext: "mp4" }; // ....ftyp (MP4)
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { kind: "image", type: "image/png", ext: "png" };
  if (startsWith(head, [0xff, 0xd8, 0xff])) return { kind: "image", type: "image/jpeg", ext: "jpg" };
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8)) return { kind: "image", type: "image/webp", ext: "webp" }; // RIFF....WEBP
  return null;
}

export const maxBytesOf = (kind: FileKind) => (kind === "image" ? IMAGE_MAX_BYTES : kind === "video" ? HERO_VIDEO_MAX_BYTES : DOCUMENT_MAX_BYTES);

// 올리려는 파일을 서버가 직접 받은 앞부분과 크기로 검사한다. 통과하면 실제 종류를 돌려준다.
export function checkFileHead(head: Uint8Array, size: number, expect: FileKind): { ok: true; sniffed: Sniffed } | { ok: false; error: string } {
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: "비어 있는 파일은 올릴 수 없어요." };
  const sniffed = sniffFile(head);
  if (!sniffed) {
    return { ok: false, error: expect === "image" ? "JPG, PNG, WEBP 이미지만 올릴 수 있어요." : expect === "video" ? "MP4 파일만 올릴 수 있어요." : "PDF 파일만 올릴 수 있어요." };
  }
  if (sniffed.kind !== expect) {
    return { ok: false, error: expect === "image" ? "이미지 요소에는 JPG, PNG, WEBP 이미지만 올릴 수 있어요." : expect === "video" ? "영상 요소에는 MP4 파일만 올릴 수 있어요." : "문서 요소에는 PDF만 올릴 수 있어요." };
  }
  if (size > maxBytesOf(expect)) {
    return { ok: false, error: expect === "image" ? "이미지는 한 장에 5MB 이하여야 해요." : expect === "video" ? "영상은 10MB 이하여야 해요." : "PDF는 한 개에 10MB 이하여야 해요." };
  }
  return { ok: true, sniffed };
}

// ── 프로필 대표 이미지·영상(MP4) ────────────────────────────────────────────────
// 대표 파일은 이미지·영상만 받는다(PDF는 거절). 작품 요소 영상 파일(2026-11-09 D18 개정)과 같은 MP4 검사를 쓴다.
export type HeroSniffed = { kind: HeroFileKind; type: "image/jpeg" | "image/png" | "image/webp" | "video/mp4"; ext: "jpg" | "png" | "webp" | "mp4" };

export function sniffHero(head: Uint8Array): HeroSniffed | null {
  const f = sniffFile(head);
  return f && (f.kind === "image" || f.kind === "video") ? ({ kind: f.kind, type: f.type, ext: f.ext } as HeroSniffed) : null;
}

export const maxHeroBytes = (kind: HeroFileKind) => (kind === "image" ? IMAGE_MAX_BYTES : HERO_VIDEO_MAX_BYTES);

export function checkHeroHead(head: Uint8Array, size: number, expect: HeroFileKind): { ok: true; sniffed: HeroSniffed } | { ok: false; error: string } {
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: "비어 있는 파일은 올릴 수 없어요." };
  const sniffed = sniffHero(head);
  if (!sniffed) return { ok: false, error: expect === "image" ? "JPG, PNG, WEBP 파일만 올릴 수 있어요." : "MP4 파일만 올릴 수 있어요." };
  if (sniffed.kind !== expect) return { ok: false, error: expect === "image" ? "이미지를 골라 주세요(JPG, PNG, WEBP)." : "영상을 골라 주세요(MP4)." };
  if (size > maxHeroBytes(expect)) return { ok: false, error: expect === "image" ? "이미지는 5MB 이하여야 해요." : "영상은 10MB 이하여야 해요." };
  return { ok: true, sniffed };
}

// ── 파일 이름과 본인 표식 ───────────────────────────────────────────────────────────
function secret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("서버 전용 Supabase 설정(SUPABASE_SERVICE_ROLE_KEY)이 없습니다.");
  return key;
}
const tagOf = (userId: string, rand: string) => createHmac("sha256", secret()).update(`creator-file:${userId}:${rand}`).digest("hex").slice(0, 15);
const NAME_RE = /^([0-9a-f]{20})-([0-9a-f]{15})\.(jpg|png|webp|pdf|mp4)$/;

export function newFileName(userId: string, ext: Sniffed["ext"] | "mp4"): string {
  const rand = randomBytes(10).toString("hex"); // 20자
  return `${rand}-${tagOf(userId, rand)}.${ext}`;
}

// 이 파일 이름이 이 사람에게 발급된 것인지(표식이 맞는지)
export function fileBelongsTo(userId: string, name: string): boolean {
  const m = NAME_RE.exec(name);
  if (!m) return false;
  const want = Buffer.from(tagOf(userId, m[1]));
  const got = Buffer.from(m[2]);
  return want.length === got.length && timingSafeEqual(want, got);
}

// ── 올리기 ─────────────────────────────────────────────────────────────────────────
// 브라우저가 보관함에 직접 올릴 1회용 자리를 만든다(요청 크기 한도 4.5MB를 피하려고). 호출하는 쪽이 권한을 먼저 확인했어야 한다.
export async function createUploadSlot(userId: string, ext: Sniffed["ext"] | "mp4"): Promise<{ path: string; token: string } | null> {
  const path = newFileName(userId, ext);
  const { data, error } = await createAdminClient().storage.from(CREATOR_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return null;
  return { path, token: data.token };
}

// 올라온 파일을 읽어 검사한다(크기는 보관함이 기록한 실제 크기를 쓴다). 본인 표식이 없으면 읽지 않는다.
export async function inspectUploaded(userId: string, path: string, expect: FileKind): Promise<
  { ok: true; size: number; sniffed: Sniffed } | { ok: false; error: string }
> {
  if (!fileBelongsTo(userId, path)) return { ok: false, error: "올린 파일을 찾을 수 없어요. 다시 올려 주세요." };
  const bucket = createAdminClient().storage.from(CREATOR_BUCKET);
  const { data, error } = await bucket.download(path);
  if (error || !data) return { ok: false, error: "올린 파일을 찾을 수 없어요. 다시 올려 주세요." };
  const size = data.size;
  const head = new Uint8Array(await data.slice(0, 16).arrayBuffer());
  const checked = checkFileHead(head, size, expect);
  if (!checked.ok) return checked;
  return { ok: true, size, sniffed: checked.sniffed };
}

// 대표 파일 버전: 올라온 파일을 읽어 검사한다(크기는 보관함이 기록한 실제 크기).
export async function inspectUploadedHero(userId: string, path: string, expect: HeroFileKind): Promise<
  { ok: true; size: number; sniffed: HeroSniffed } | { ok: false; error: string }
> {
  if (!fileBelongsTo(userId, path)) return { ok: false, error: "올린 파일을 찾을 수 없어요. 다시 올려 주세요." };
  const { data, error } = await createAdminClient().storage.from(CREATOR_BUCKET).download(path);
  if (error || !data) return { ok: false, error: "올린 파일을 찾을 수 없어요. 다시 올려 주세요." };
  const size = data.size;
  const head = new Uint8Array(await data.slice(0, 16).arrayBuffer());
  const checked = checkHeroHead(head, size, expect);
  if (!checked.ok) return checked;
  return { ok: true, size, sniffed: checked.sniffed };
}

// 본인 표식이 붙은 파일만 지운다. 못 지운 것은 조용히 남는다(다음 정리에서 처리).
export async function removeOwnFiles(userId: string, paths: readonly (string | null | undefined)[]): Promise<void> {
  const own = Array.from(new Set(paths.filter((p): p is string => Boolean(p) && fileBelongsTo(userId, p as string))));
  if (own.length === 0) return;
  try {
    await createAdminClient().storage.from(CREATOR_BUCKET).remove(own);
  } catch {
    // 파일 정리 실패가 화면 동작을 막지 않게 한다
  }
}

// ── 보여 주기(짧은 임시 주소) ──────────────────────────────────────────────────────
async function sign(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const { data } = await createAdminClient().storage.from(CREATOR_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  for (const row of data ?? []) if (row.path && row.signedUrl && !row.error) out.set(row.path, row.signedUrl);
  return out;
}

const SAFE_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp|mp4|pdf)$/;

// 공개 화면용: 공개용 보기(view)에 실제로 올라와 있는 파일(공개 프로필의 공개 작품 요소, 공개 프로필의 대표 파일)만 임시 주소를 만든다.
export async function signPublicFiles(paths: readonly (string | null | undefined)[]): Promise<Map<string, string>> {
  const wanted = Array.from(new Set(paths.filter((p): p is string => typeof p === "string" && SAFE_NAME.test(p))));
  if (wanted.length === 0) return new Map();
  const sb = getSupabase();
  const [blocks, heroes] = await Promise.all([
    sb.from("creator_blocks_public").select("file_path").in("file_path", wanted),
    sb.from("creators_public").select("hero_path").in("hero_path", wanted),
  ]);
  const allowed = new Set<string>();
  for (const r of (blocks.data ?? []) as { file_path: string | null }[]) if (r.file_path) allowed.add(r.file_path);
  for (const r of (heroes.data ?? []) as { hero_path: string | null }[]) if (r.hero_path) allowed.add(r.hero_path);
  return sign(wanted.filter((p) => allowed.has(p)));
}

// 내 요소에 걸려 있는데 표식이 맞지 않는 파일을 새 이름으로 다시 저장해 표식을 맞춘다.
// 다른 사람의 요소나 대표 파일에 걸린 이름이면 손대지 않는다. 바꾼 것은 「옛 이름 → 새 이름」으로 돌려준다.
export async function retagOwnFiles(userId: string, rows: readonly { id: string; file_path: string | null }[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const bad = rows.filter((r) => r.file_path && NAME_RE.test(r.file_path) && !fileBelongsTo(userId, r.file_path));
  if (bad.length === 0) return out;
  const admin = createAdminClient();
  for (const r of bad) {
    const old = r.file_path as string;
    const [others, heroes] = await Promise.all([
      admin.from("creator_work_blocks").select("id").eq("file_path", old).neq("owner_id", userId).limit(1),
      admin.from("creator_profiles").select("user_id").eq("hero_path", old).neq("user_id", userId).limit(1),
    ]);
    if (others.error || heroes.error || (others.data ?? []).length > 0 || (heroes.data ?? []).length > 0) continue;
    const ext = (NAME_RE.exec(old) as RegExpExecArray)[3] as Sniffed["ext"];
    const fresh = newFileName(userId, ext);
    const copied = await admin.storage.from(CREATOR_BUCKET).copy(old, fresh);
    if (copied.error) continue;
    const moved = await admin.from("creator_work_blocks").update({ file_path: fresh }).eq("id", r.id).eq("owner_id", userId).eq("file_path", old);
    if (moved.error) {
      await admin.storage.from(CREATOR_BUCKET).remove([fresh]);
      continue;
    }
    await admin.storage.from(CREATOR_BUCKET).remove([old]);
    out.set(old, fresh);
  }
  return out;
}

// 본인 화면용(비공개 작품 미리 보기, 마이페이지): 본인 표식이 붙은 파일만 임시 주소를 만든다. 호출하는 쪽이 본인 확인을 마쳤어야 한다.
export async function signOwnFiles(userId: string, paths: readonly (string | null | undefined)[]): Promise<Map<string, string>> {
  const own = Array.from(new Set(paths.filter((p): p is string => Boolean(p) && fileBelongsTo(userId, p as string))));
  return sign(own);
}
