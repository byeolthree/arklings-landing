// 이 브라우저를 구분하는 무작위 값(쿠키 arklings_anon). 자체 DB 기록과 Amplitude 기기 번호가 같은 값을 쓴다.
import { ANON_COOKIE, ANON_ID_RE } from "@/lib/measure/events";

export const ANON_COOKIE_DAYS = 90; // 보관 기간 90일과 같다(아키텍터 결정 2026-11-11)

function readAnon(): string | null {
  const m = document.cookie.split("; ").find((c) => c.startsWith(`${ANON_COOKIE}=`));
  const v = m ? decodeURIComponent(m.slice(ANON_COOKIE.length + 1)) : "";
  return ANON_ID_RE.test(v) ? v : null;
}

export function ensureAnon(): string {
  const have = readAnon();
  if (have) return have;
  const id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`).replace(/-/g, "");
  document.cookie = `${ANON_COOKIE}=${id}; Max-Age=${ANON_COOKIE_DAYS * 86400}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  return id;
}

// 브라우저의 「추적 안 함」 설정(Do Not Track)
export function doNotTrack(): boolean {
  return typeof navigator !== "undefined" && navigator.doNotTrack === "1";
}
