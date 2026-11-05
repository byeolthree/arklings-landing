import { ROLES, type Role } from "@/lib/collab";

// 크리에이터 프로필(공개 주소·역할·소개)의 모양과 검사 규칙. 화면(브라우저)과 서버가 같은 규칙을 쓴다.
// 서버는 화면이 보낸 값을 그대로 믿지 않고 여기서 다시 검사한다.

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
export const BIO_MAX = 200;
export const ABOUT_MAX = 500; // P2 소개 글(프로필 화면에만 보임)
export const CHANNEL_MAX = 5; // P3 채널 링크 개수
export const CHANNEL_LABEL_MAX = 20;
export const URL_MAX = 2000;

// 주소(/creators/<공개주소>)와 겹치거나 헷갈리는 말은 쓸 수 없다.
export const RESERVED_HANDLES = [
  "new", "edit", "admin", "api", "auth", "creators", "creator", "portfolio", "planner", "mypage", "login", "signup",
  "privacy", "collab", "settings", "help", "about", "me", "arklings", "dev-preview",
] as const;

const HANDLE_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const BAD_TEXT_RE = /[\u0000-\u001f\u007f<>]/;

export type Channel = { label: string; url: string };
export type ProfileValues = {
  handle: string;
  roles: Role[];
  bio: string; // 카드용 한 줄 소개
  about: string; // P2 소개 글
  channels: Channel[]; // P3 채널 링크
  openToCollab: boolean; // P6 협업 신청 받기(기본 켜짐)
  isPublic: boolean; // 프로필 공개 여부(마이페이지에서 만들면 기본 비공개, 기획안을 올리며 만들면 공개)
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
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return "주소 모양이 맞지 않아요.";
  }
  if (u.protocol !== "https:" || !u.hostname) return "https:// 로 시작하는 주소만 쓸 수 있어요.";
  return null;
}

export type ProfileInput = {
  handle: string;
  roles: readonly string[];
  bio: string;
  about?: string;
  channels?: readonly Channel[];
  openToCollab?: boolean;
  isPublic?: boolean;
};

export function validateCreatorProfile(input: ProfileInput):
  | { ok: true; value: ProfileValues }
  | { ok: false; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const handle = normalizeHandle(input.handle);
  const handleError = validateHandle(handle);
  if (handleError) errors.handle = handleError;

  const roles = Array.from(new Set(input.roles.filter(isRole)));
  if (roles.length === 0) errors.roles = "역할을 하나 이상 골라 주세요.";

  const bio = input.bio.replace(/\s+/g, " ").trim();
  if (bio.length > BIO_MAX) errors.bio = `소개는 ${BIO_MAX}자 이내로 적어 주세요.`;
  else if (BAD_TEXT_RE.test(bio)) errors.bio = "소개에 쓸 수 없는 문자가 있어요.";

  const about = (input.about ?? "").replace(/\r\n/g, "\n").trim();
  if (about.length > ABOUT_MAX) errors.about = `소개 글은 ${ABOUT_MAX}자 이내로 적어 주세요.`;
  else if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/.test(about)) errors.about = "소개 글에 쓸 수 없는 문자가 있어요.";

  // 채널 링크: 이름과 주소가 모두 빈 줄은 뺀다
  const channels: Channel[] = [];
  for (const c of input.channels ?? []) {
    const label = c.label.replace(/\s+/g, " ").trim();
    const url = c.url.trim();
    if (!label && !url) continue;
    if (!label || label.length > CHANNEL_LABEL_MAX || BAD_TEXT_RE.test(label)) {
      errors.channels = `채널 이름은 1~${CHANNEL_LABEL_MAX}자로 적어 주세요.`;
      break;
    }
    const urlError = validateHttpsUrl(url);
    if (urlError) {
      errors.channels = `「${label}」 ${urlError}`;
      break;
    }
    channels.push({ label, url });
  }
  if (!errors.channels && channels.length > CHANNEL_MAX) errors.channels = `채널은 ${CHANNEL_MAX}개까지 넣을 수 있어요.`;

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, value: { handle, roles, bio, about, channels, openToCollab: input.openToCollab ?? true, isPublic: input.isPublic ?? false } };
}
