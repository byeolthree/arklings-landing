import { Analytics } from "@vercel/analytics/next";
import { MEASURE_ENABLED } from "@/lib/measure/config";

// 방문 통계(Vercel Web Analytics). app/layout.tsx가 그린다. 대시보드에서 켜기 전에는 아무것도 모이지 않는다.
export function MeasureAnalytics() {
  return MEASURE_ENABLED ? <Analytics /> : null;
}
