// 사용 기록 받기(서버 전용). app/api/events/route.ts가 lib/measure/server.ts를 거쳐 부른다. 시험할 수 있게 DB 연결을 밖에서 넘겨 받는다.
// 순서: 출처(Origin) → 크기 → 모양 → 허용 목록·부가 값 검사 → DB 함수 호출. 기록이 DB에서 거절되거나 실패해도 화면에는 알리지 않는다(204).
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSameOrigin } from "@/lib/same-origin";
import { MEASURE_ENABLED } from "@/lib/measure/config";
import { parseUsageEvent } from "@/lib/measure/events";
import { recordUsageEvent } from "@/lib/measure/record";

export const USAGE_MAX_BODY_CHARS = 2000;

export async function handleUsageEvent(req: Request, deps: { supabase: () => Promise<SupabaseClient> }): Promise<Response> {
  if (!MEASURE_ENABLED) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } }); // 측정을 끈 동안은 받아도 남기지 않는다
  if (!isSameOrigin(req)) return new Response(null, { status: 403 });
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > USAGE_MAX_BODY_CHARS * 3) return new Response(null, { status: 413 });
  let text: string;
  try {
    text = await req.text();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (text.length > USAGE_MAX_BODY_CHARS) return new Response(null, { status: 413 });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = parseUsageEvent(raw);
  if (!parsed.ok) return new Response(null, { status: 400 });
  try {
    await recordUsageEvent(await deps.supabase(), parsed.value);
  } catch {
    // 연결 설정이 없거나 DB가 준비되지 않았어도 화면에는 영향이 없다
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
