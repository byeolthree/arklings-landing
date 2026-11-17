// 브라우저에서 사용 기록을 알리는 도구. 정해진 행동(lib/measure/events.ts)만 보낸다. 글 내용·이메일·이름은 보내지 않는다.
// 한 번 기록하면 ① 자체 DB(/api/events) ② Amplitude ③ GTM의 dataLayer 세 곳으로 간다(②③은 키가 있을 때만. lib/measure/external.ts).
// 서버가 성공을 확정하는 행동(가입·로그인·AI 평가 결과·협업 신청 완료)은 여기서 보내지 못하게 막아 두었다(서버의 trackServer만 쓴다).
// 브라우저의 「추적 안 함」 설정(Do Not Track)이 켜져 있으면 아무것도 보내지 않는다.
import { ensureAnon, doNotTrack } from "@/lib/measure/anon";
import { MEASURE_ENABLED } from "@/lib/measure/config";
import type { BrowserEvent, UsageProps } from "@/lib/measure/events";
import { sendExternal } from "@/lib/measure/external";

export { ANON_COOKIE_DAYS } from "@/lib/measure/anon";

export function trackEvent(event: BrowserEvent, props: UsageProps = {}): void {
  if (!MEASURE_ENABLED || typeof window === "undefined") return;
  try {
    if (doNotTrack()) return;
    const body = JSON.stringify({ event, anonId: ensureAnon(), page: location.pathname, props });
    void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    sendExternal(event, props);
  } catch {
    // 기록하지 못해도 화면 동작에는 영향이 없다
  }
}
