import { ROLES, type Role } from "@/lib/collab";

// 크리에이터 프로필(공개 주소·역할·소개)의 모양과 검사 규칙. 화면(브라우저)과 서버가 같은 규칙을 쓴다.
// 서버는 화면이 보낸 값을 그대로 믿지 않고 여기서 다시 검사한다.

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
export const BIO_MAX = 200;

// 주소(/creators/<공개주소>)와 겹치거나 헷갈리는 말은 쓸 수 없다.
export const RESERVED_HANDLES = [
  "new", "edit", "admin", "api", "auth", "creators", "creator", "portfolio", "planner", "mypage", "login", "signup",
  "privacy", "collab", "settings", "help", "about", "me", "arklings", "dev-preview",
] as const;

const HANDLE_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const BAD_TEXT_RE = /[\u0000-\u001f\u007f<>]/;

export type ProfileValues = { handle: string; roles: Role[]; bio: string };
export type ProfileErrors = Partial<Record<"handle" | "roles" | "bio", string>>;

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

export function validateCreatorProfile(input: { handle: string; roles: readonly string[]; bio: string }):
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

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { handle, roles, bio } };
}
