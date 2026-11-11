// 하루 사용 횟수의 자리 잡기·돌려주기(0017). 한도 숫자는 DB 함수 안에 있고, 여기서는 함수만 부른다.
// 자리표(uuid)는 서버 코드만 들고 있다가 호출이 실패했을 때만 돌려준다(화면에 내보내지 않는다).
import type { SupabaseClient } from "@supabase/supabase-js";

export type AiFeature = "evaluate_logline" | "library_ask";
export type Reserve = { ok: true; holdId: string } | { ok: false; reason: "limit" | "unavailable" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 모델을 부르기 전에 부른다. 한도가 찼으면 limit, DB 함수가 없거나 오류이면 unavailable(조회 실패를 0으로 보고 통과시키지 않는다).
export async function reserveAiUse(sb: SupabaseClient, feature: AiFeature): Promise<Reserve> {
  try {
    const { data, error } = await sb.rpc("reserve_ai_use", { p_feature: feature, p_units: 1 });
    if (error) return { ok: false, reason: "unavailable" };
    if (typeof data === "string" && UUID.test(data)) return { ok: true, holdId: data };
    return { ok: false, reason: "limit" }; // 로그인·이메일 확인은 호출 전에 이미 확인했으므로 빈 값은 한도 초과다
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

// 호출이 실패해 결과를 못 받았을 때만 부른다. 돌려주지 못해도 사용자에게는 영향이 없도록 조용히 기록만 남긴다.
export async function releaseAiUse(sb: SupabaseClient, holdId: string): Promise<void> {
  try {
    await sb.rpc("release_ai_use", { p_hold: holdId });
  } catch {
    console.error("[ai] 사용 횟수 자리를 돌려주지 못했습니다.");
  }
}
