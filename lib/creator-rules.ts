import { GENRES } from "@/components/creators/genres";
import { FORM_LABEL, WORK_KINDS, type WorkForm } from "@/components/creators/types";
import { ROLES, type Role } from "@/lib/collab";

// 크리에이터 프로필·작품·작품 안 요소의 모양과 글자 수·개수 규칙. 화면(브라우저)과 서버가 같은 규칙을 쓴다.
// 서버는 화면이 보낸 값을 그대로 믿지 않고 여기서 다시 검사한다. DB(0009)도 같은 한도를 한 번 더 막는다.

// ── 프로필 ──────────────────────────────────────────────────────────────────────
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
// 소개 글은 하나다(한 줄 소개는 없앴다, 0-4 5번). DB 칸 이름은 bio. 화면 부품이 쓰던 이름 ABOUT_MAX는 같은 값의 별칭이다.
export const BIO_MAX = 500;
export const ABOUT_MAX = BIO_MAX;
export const CHANNEL_MAX = 5; // 채널 링크 개수
export const CHANNEL_LABEL_MAX = 20;
export const URL_MAX = 2000;

// 주소(/creators/<공개주소>)와 겹치거나 헷갈리는 말은 쓸 수 없다. DB의 목록(0009)과 같아야 한다.
export const RESERVED_HANDLES = [
  "new", "edit", "admin", "api", "auth", "creators", "creator", "portfolio", "planner", "mypage", "login", "signup",
  "privacy", "collab", "settings", "help", "about", "me", "arklings", "dev-preview",
] as const;

const HANDLE_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
// 한 줄 글(이름·제목): 줄바꿈·탭을 포함한 제어 문자와 < > 금지 (DB 검사와 같다)
const BAD_LINE_RE = /[\u0000-\u001f\u007f<>]/;
// 여러 줄 글(소개 글·로그라인·글 요소): 줄바꿈·탭은 허용, 나머지 제어 문자와 < > 금지 (DB 검사와 같다)
const BAD_TEXT_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/;

export type Channel = { label: string; url: string };
export type ProfileValues = {
  handle: string;
  roles: Role[];
  bio?: string; // 쓰지 않는다(한 줄 소개 폐지). 화면 샘플이 아직 넘기는 값이라 남겨 둔다
  about: string; // 소개 글(선택, 500자). DB에서는 bio 칸
  channels: Channel[];
  openToCollab: boolean; // 협업 신청 받기(기본 켜짐)
  isPublic: boolean; // 프로필 공개 여부(마이페이지에서 만들면 기본 비공개)
};
export type ProfileErrors = Partial<Record<"handle" | "roles" | "bio" | "about" | "channels", string>>;

export const isRole = (v: unknown): v is Role => typeof v === "string" && Object.prototype.hasOwnProperty.call(ROLES, v);

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateHandle(raw: string): string | null {
  const h = normalizeHandle(raw);
  if (!h) return "공개 주소를 입력해 주세요.";
  if (h.length < HANDLE_MIN || h.length > HANDLE_MAX) return `공개 주소는 ${HANDLE_MIN}~${HANDLE_MAX}자로 적어 주세요.`;
  if (!HANDLE_RE.test(h) || h.includes("--")) return "영문 소문자, 숫자, 하이픈(-)만 쓸 수 있어요. 처음과 끝은 하이픈이 아니어야 하고, 하이픈을 연달아 쓸 수 없어요.";
  if ((RESERVED_HANDLES as readonly string[]).includes(h)) return "이 주소는 쓸 수 없어요. 다른 주소를 적어 주세요.";
  return null;
}

// https 주소만 받는다(2000자 이내). 문제가 없으면 null, 있으면 이유.
export function validateHttpsUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "주소를 입력해 주세요.";
  if (v.length > URL_MAX) return `주소는 ${URL_MAX}자 이내로 적어 주세요.`;
  if (/\s/.test(v)) return "주소에 공백이 있어요.";
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return "주소 모양이 맞지 않아요.";
  }
  if (u.protocol !== "https:" || !u.hostname) return "https:// 로 시작하는 주소만 쓸 수 있어요.";
  return null;
}

// 채널 링크 목록 검사. 이름과 주소가 모두 빈 줄은 뺀다.
export function validateChannels(input: readonly Channel[]): { ok: true; value: Channel[] } | { ok: false; error: string } {
  const channels: Channel[] = [];
  for (const c of input) {
    const label = String(c?.label ?? "").replace(/\s+/g, " ").trim();
    const url = String(c?.url ?? "").trim();
    if (!label && !url) continue;
    if (!label || label.length > CHANNEL_LABEL_MAX || BAD_LINE_RE.test(label)) {
      return { ok: false, error: `채널 이름은 1~${CHANNEL_LABEL_MAX}자로 적어 주세요.` };
    }
    const urlError = validateHttpsUrl(url);
    if (urlError) return { ok: false, error: `「${label}」 ${urlError}` };
    channels.push({ label, url });
  }
  if (channels.length > CHANNEL_MAX) return { ok: false, error: `채널은 ${CHANNEL_MAX}개까지 넣을 수 있어요.` };
  return { ok: true, value: channels };
}

export type ProfileInput = {
  handle: string;
  roles: readonly string[];
  bio?: string; // 쓰지 않는다
  about?: string;
  channels?: readonly Channel[];
  openToCollab?: boolean;
  isPublic?: boolean;
};

export function validateCreatorProfile(input: ProfileInput):
  | { ok: true; value: ProfileValues }
  | { ok: false; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const handle = normalizeHandle(String(input.handle ?? ""));
  const handleError = validateHandle(handle);
  if (handleError) errors.handle = handleError;

  // 프로필 역할은 보낸 순서를 그대로 저장한다. 맨 앞 역할이 「대표 역할」이다(역할 태그를 두 번 눌러 정한다).
  const roles = Array.from(new Set((Array.isArray(input.roles) ? input.roles : []).filter(isRole)));
  if (roles.length === 0) errors.roles = "역할을 하나 이상 골라 주세요.";

  const about = String(input.about ?? "").replace(/\r\n/g, "\n").trim();
  if (about.length > BIO_MAX) errors.about = `소개 글은 ${BIO_MAX}자 이내로 적어 주세요.`;
  else if (BAD_TEXT_RE.test(about)) errors.about = "소개 글에 쓸 수 없는 문자가 있어요.";

  const ch = validateChannels(input.channels ?? []);
  if (!ch.ok) errors.channels = ch.error;

  return Object.keys(errors).length || !ch.ok
    ? { ok: false, errors }
    : { ok: true, value: { handle, roles, about, channels: ch.value, openToCollab: input.openToCollab ?? true, isPublic: input.isPublic ?? false } };
}

// ── 작품 ────────────────────────────────────────────────────────────────────────
export const WORK_LIMIT = 12; // 사람당 작품 수
export const BLOCK_LIMIT = 20; // 작품당 요소 수
export const LOGLINE_TOKEN = "logline"; // 요소 순서 목록에서 로그라인 블록을 가리키는 글자(D35-2)
export const TITLE_MAX = 60;
export const LOGLINE_MAX = 200; // 띄어쓰기를 뺀 글자 수(기획안 화면의 로그라인과 같은 제한, D35)
export const LOGLINE_STORE_MAX = 1000; // 띄어쓰기를 포함해 저장할 수 있는 한도(DB 검사)
export const TEXT_BLOCK_MAX = 5000;

// 작품 요소의 세부 종류(시안 01 요소 종류 칩의 글자 그대로, DB 0012가 같은 목록으로 거른다). 이미지 요소에는 세부 종류가 없다.
export const VIDEO_SUBKINDS = ["티저", "예고편", "선공개", "파일럿", "피치 영상"] as const;
export const DOC_SUBKINDS = ["시놉시스", "트리트먼트", "아웃라인", "시리즈 바이블", "파일럿", "피치 문서"] as const;
export type BlockKind = "text" | "image" | "video" | "document";
// 비어 있으면 null(종류를 안 고른 것). 요소 종류에 없는 글자면 undefined(거절).
export function parseSubKind(kind: BlockKind, raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") return undefined;
  const list: readonly string[] = kind === "video" ? VIDEO_SUBKINDS : kind === "image" ? [] : DOC_SUBKINDS;
  return list.includes(raw) ? raw : undefined;
}

export type WorkInput = {
  title: string;
  roles: readonly string[];
  genres?: readonly string[];
  kind?: string | null;
  form?: string | null;
  logline?: string;
  planId?: string | null;
};
export type WorkValues = {
  title: string;
  roles: Role[];
  genres: string[];
  kind: string | null;
  form: WorkForm | null;
  logline: string;
  planId: string | null;
};
export type WorkErrors = Partial<Record<"title" | "roles" | "genres" | "kind" | "form" | "logline" | "planId", string>>;

export const countLoglineChars = (s: string) => s.replace(/\s/g, "").length;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isForm = (v: unknown): v is WorkForm => typeof v === "string" && Object.prototype.hasOwnProperty.call(FORM_LABEL, v);

export function validateWork(input: WorkInput):
  | { ok: true; value: WorkValues }
  | { ok: false; errors: WorkErrors } {
  const errors: WorkErrors = {};

  const title = String(input.title ?? "").replace(/\s+/g, " ").trim();
  if (!title) errors.title = "작품 제목을 입력해 주세요.";
  else if (title.length > TITLE_MAX) errors.title = `작품 제목은 ${TITLE_MAX}자 이내로 적어 주세요.`;
  else if (BAD_LINE_RE.test(title)) errors.title = "제목에 쓸 수 없는 문자가 있어요.";

  const roles = Array.from(new Set((Array.isArray(input.roles) ? input.roles : []).filter(isRole)));
  if (roles.length === 0) errors.roles = "역할을 하나 이상 골라 주세요.";

  const rawGenres = Array.isArray(input.genres) ? input.genres : [];
  const genres = Array.from(new Set(rawGenres.filter((g): g is string => typeof g === "string" && GENRES.includes(g))));
  if (genres.length !== new Set(rawGenres).size) errors.genres = "고를 수 없는 장르가 있어요.";

  const kind = input.kind ? String(input.kind) : null;
  if (kind && !(WORK_KINDS as readonly string[]).includes(kind)) errors.kind = "고를 수 없는 작품 종류예요.";

  const form = input.form ? input.form : null;
  if (form && !isForm(form)) errors.form = "분량은 롱폼이나 숏폼 중에서 골라 주세요.";

  const logline = String(input.logline ?? "").replace(/\r\n/g, "\n").trim();
  if (logline.length > LOGLINE_STORE_MAX) errors.logline = `로그라인은 ${LOGLINE_STORE_MAX}자 이내로 적어 주세요.`;
  else if (countLoglineChars(logline) > LOGLINE_MAX) errors.logline = `로그라인은 띄어쓰기를 뺀 ${LOGLINE_MAX}자 이내로 적어 주세요.`;
  else if (BAD_TEXT_RE.test(logline)) errors.logline = "로그라인에 쓸 수 없는 문자가 있어요.";

  const planId = input.planId ? String(input.planId) : null;
  if (planId && !UUID.test(planId)) errors.planId = "붙일 수 없는 기획안이에요.";

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, value: { title, roles, genres, kind, form: (form as WorkForm | null) ?? null, logline, planId } };
}

export function validateTextBlock(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const body = String(raw ?? "").replace(/\r\n/g, "\n").trim();
  if (!body) return { ok: false, error: "문서를 입력해 주세요." };
  if (body.length > TEXT_BLOCK_MAX) return { ok: false, error: `문서는 ${TEXT_BLOCK_MAX}자 이내로 적어 주세요.` };
  if (BAD_TEXT_RE.test(body)) return { ok: false, error: "문서에 쓸 수 없는 문자가 있어요." };
  return { ok: true, value: body };
}

// 유튜브 주소(watch?v=, youtu.be/, shorts/, embed/)에서 11자 영상 번호를 뽑는다. 그 밖의 주소는 null.
export function parseYoutubeId(raw: string): string | null {
  const v = String(raw ?? "").trim();
  if (!v || v.length > URL_MAX || /\s/.test(v)) return null;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") id = u.searchParams.get("v");
    else if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") id = parts[1] ?? null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

// ── 파일 ────────────────────────────────────────────────────────────────────────
export const MB = 1024 * 1024;
export const IMAGE_MAX_BYTES = 5 * MB; // 이미지 한 장 (JPG·PNG·WEBP)
export const DOCUMENT_MAX_BYTES = 10 * MB; // PDF 한 개
export const HERO_VIDEO_MAX_BYTES = 10 * MB; // 프로필 대표 영상 한 개 (MP4, 0-4 v). 대표 이미지는 IMAGE_MAX_BYTES(5MB)
export const QUOTA_BYTES = 20 * MB; // 사람당 합계 (작품 요소의 이미지+PDF와 프로필 대표 이미지·영상을 합쳐서, 별뜨리님 지시 2026-11-09)
export type FileKind = "image" | "document" | "video"; // 작품 요소 파일의 종류(영상 파일은 2026-11-09 D18 개정으로 더함)
export type HeroFileKind = "image" | "video"; // 프로필 대표 파일의 종류
export const FILE_KIND_LABEL: Record<FileKind, string> = { video: "영상(MP4, 10MB 이하)", image: "이미지(JPG·PNG·WEBP, 5MB 이하)", document: "PDF(10MB 이하)" };
