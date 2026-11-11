// 사용 기록을 DB(0021 record_usage_event)에 남기는 서버 쪽 도구. 기록이 실패해도 화면 동작에는 영향이 없게 조용히 넘어간다.
// 서버 전용 열쇠는 쓰지 않는다: 호출한 사람의 연결로 함수를 부르고, user_id는 DB가 로그인 정보(auth.uid())에서 채운다.
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { MEASURE_ENABLED } from "@/lib/measure/config";
import { ANON_COOKIE, ANON_ID_RE, type UsageEvent, type UsageProps, type UsageRecord } from "@/lib/measure/events";

export async function recordUsageEvent(sb: SupabaseClient, rec: UsageRecord): Promise<boolean> {
  if (!MEASURE_ENABLED) return false;
  try {
    const { data, error } = await sb.rpc("record_usage_event", { p_anon_id: rec.anonId, p_event: rec.event, p_page: rec.page, p_props: rec.props });
    return !error && data === true;
  } catch {
    return false;
  }
}

// 서버 동작·길(로그인·가입 등)에서 쓴다. 브라우저의 무작위 값은 쿠키에 있으면 함께 남긴다.
export async function trackServer(sb: SupabaseClient, event: UsageEvent, page: string, props: UsageProps = {}): Promise<void> {
  try {
    const raw = (await cookies()).get(ANON_COOKIE)?.value;
    const anonId = raw && ANON_ID_RE.test(raw) ? raw : null;
    await recordUsageEvent(sb, { event, anonId, page, props });
  } catch {
    // 기록하지 못해도 로그인·가입에는 영향이 없다
  }
}
