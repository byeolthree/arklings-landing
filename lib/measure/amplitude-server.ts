// 서버가 성공을 확정한 행동을 Amplitude HTTP API로 보낸다(가입·로그인·AI 평가 결과·협업 신청 완료). 같은 행동을 브라우저에서 다시 보내지 않는다.
// 키가 비어 있거나 측정이 꺼졌으면 아무것도 보내지 않는다. 실패해도 조용히 넘어간다(요청 처리에 영향 없음).
import { randomUUID } from "node:crypto";
import { AMPLITUDE_API_KEY, AMPLITUDE_SERVER_ZONE, MEASURE_ENABLED } from "@/lib/measure/config";
import type { UsageProps } from "@/lib/measure/events";

const ENDPOINT = { US: "https://api2.amplitude.com/2/httpapi", EU: "https://api.eu.amplitude.com/2/httpapi" } as const;

export async function sendAmplitudeServer(e: { event: string; userId: string | null; deviceId: string | null; page: string; props: UsageProps }): Promise<void> {
  if (!MEASURE_ENABLED || !AMPLITUDE_API_KEY) return;
  if (!e.userId && !e.deviceId) return; // 누구의 행동인지 알 수 없으면 보내지 않는다
  try {
    await fetch(ENDPOINT[AMPLITUDE_SERVER_ZONE], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: AMPLITUDE_API_KEY,
        events: [
          {
            event_type: e.event,
            ...(e.userId ? { user_id: e.userId } : {}),
            ...(e.deviceId ? { device_id: e.deviceId } : {}),
            event_properties: { ...e.props, page: e.page },
            insert_id: randomUUID(),
            time: Date.now(),
          },
        ],
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // 보내지 못해도 화면 동작에는 영향이 없다
  }
}
