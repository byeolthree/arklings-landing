// 브라우저에서 사용 기록을 알리는 도구. 정해진 행동(lib/measure/events.ts)만 보낸다. 글 내용·이메일·이름은 보내지 않는다.
// 이 브라우저를 구분하는 무작위 값은 쿠키(arklings_anon)에 둔다. 값의 수명은 임시로 아래 상수 한 곳에서 정한다(보관 기간 확정 전).
// 브라우저의 「추적 안 함」 설정(Do Not Track)이 켜져 있으면 아무것도 보내지 않는다.
import { MEASURE_ENABLED } from "@/lib/measure/config";
import { ANON_COOKIE, ANON_ID_RE, type UsageEvent, type UsageProps } from "@/lib/measure/events";

export const ANON_COOKIE_DAYS = 365; // 임시값

function readAnon(): string | null {
  const m = document.cookie.split("; ").find((c) => c.startsWith(`${ANON_COOKIE}=`));
  const v = m ? decodeURIComponent(m.slice(ANON_COOKIE.length + 1)) : "";
  return ANON_ID_RE.test(v) ? v : null;
}

function ensureAnon(): string {
  const have = readAnon();
  if (have) return have;
  const id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`).replace(/-/g, "");
  document.cookie = `${ANON_COOKIE}=${id}; Max-Age=${ANON_COOKIE_DAYS * 86400}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  return id;
}

export function trackEvent(event: UsageEvent, props: UsageProps = {}): void {
  if (!MEASURE_ENABLED || typeof window === "undefined") return;
  try {
    if (navigator.doNotTrack === "1") return;
    const body = JSON.stringify({ event, anonId: ensureAnon(), page: location.pathname, props });
    void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    // 기록하지 못해도 화면 동작에는 영향이 없다
  }
}
