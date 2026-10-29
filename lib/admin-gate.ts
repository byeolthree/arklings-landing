import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 로그인을 붙이기 전까지만 쓰는 임시 조치다. 협업 신청 목록·상세·수정·삭제를 운영자용 비밀번호로 잠근다.
// 비밀번호는 환경 변수(ADMIN_TEMP_PASSWORD)에만 있고, 설정이 없으면 아무도 열 수 없다(안전한 쪽으로 닫힘).
// 로그인과 받는 사람 규칙이 붙는 단계 2에서 이 파일은 없앤다.
export const GATE_COOKIE = "arklings_gate";
const GATE_MAX_AGE = 60 * 60 * 8; // 8시간
const GATE_PATH = "/collab/gate";

function configured(): string | null {
  const v = process.env.ADMIN_TEMP_PASSWORD;
  return v && v.length > 0 ? v : null;
}

// 비밀번호를 그대로 쿠키에 넣지 않고, 비밀번호로 만든 서명값을 넣는다.
function tokenFor(password: string): string {
  return createHmac("sha256", password).update("arklings-admin-gate-v1").digest("hex");
}

function sameValue(a: string, b: string): boolean {
  const ha = createHmac("sha256", "compare").update(a).digest();
  const hb = createHmac("sha256", "compare").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isGateConfigured(): boolean {
  return configured() !== null;
}

export function checkGatePassword(input: string): boolean {
  const pw = configured();
  if (!pw) return false;
  return sameValue(input, pw);
}

export async function hasGateAccess(): Promise<boolean> {
  // 쿠키를 먼저 읽어야 이 화면이 "요청 때마다 그리는 화면"으로 처리된다(빌드 때 굳어 버리지 않게).
  const value = (await cookies()).get(GATE_COOKIE)?.value;
  const pw = configured();
  if (!pw) return false;
  if (!value) return false;
  return sameValue(value, tokenFor(pw));
}

export async function grantGateAccess(): Promise<void> {
  const pw = configured();
  if (!pw) return;
  (await cookies()).set(GATE_COOKIE, tokenFor(pw), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GATE_MAX_AGE,
  });
}

// 화면(서버 컴포넌트)에서 쓴다. 열쇠가 없으면 비밀번호 화면으로 보내고, 입력 뒤 원래 화면으로 돌아오게 한다.
export async function requireGateAccess(returnPath: string): Promise<void> {
  if (await hasGateAccess()) return;
  redirect(`${GATE_PATH}?next=${encodeURIComponent(returnPath)}`);
}

// 돌아갈 주소는 /collab 안쪽 경로만 허용한다(//, \, 외부 주소는 무시).
export function safeGateNext(raw: string | undefined | null): string {
  if (!raw) return "/collab";
  if (!/^\/collab(\/[A-Za-z0-9\-_/?=&%.]*)?$/.test(raw)) return "/collab";
  if (raw.includes("//") || raw.includes("\\")) return "/collab";
  return raw;
}
