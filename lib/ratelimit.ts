import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// 봇 방지(외부 서비스 없음): 접속 주소를 소금과 함께 해시한 값만 짧게 기록하고, 짧은 시간에 너무 많이 보내면 막는다.
// 접속 주소 원본은 저장하지 않는다.
export const LIMIT_PER_HOUR = 5;
export const LIMIT_PER_DAY = 20;
const KEEP_HOURS = 48;

export async function getClientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || "unknown";
  // 소금 환경 변수가 없으면 서버 전용 열쇠를 대신 쓴다(둘 다 없으면 어차피 저장이 안 된다).
  const salt = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "arklings";
  return createHmac("sha256", salt).update(ip).digest("hex");
}

export async function isRateLimited(key: string): Promise<boolean> {
  const sb = createAdminClient();
  const now = Date.now();
  const since = (ms: number) => new Date(now - ms).toISOString();
  const count = async (ms: number) => {
    const { count, error } = await sb
      .from("submit_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", key)
      .gte("created_at", since(ms));
    // 횟수를 확인하지 못하면(오류이거나 숫자를 못 받으면) 통과시키지 않고 접수를 멈춘다(안전한 쪽으로 닫힘).
    if (error || count === null) throw new Error(error?.message ?? "count unavailable");
    return count;
  };
  const [hour, day] = await Promise.all([count(60 * 60 * 1000), count(24 * 60 * 60 * 1000)]);
  return hour >= LIMIT_PER_HOUR || day >= LIMIT_PER_DAY;
}

export async function recordAttempt(key: string): Promise<void> {
  const sb = createAdminClient();
  await sb.from("submit_attempts").insert({ ip_hash: key });
  // 오래된 기록은 지나가는 김에 정리한다.
  await sb.from("submit_attempts").delete().lt("created_at", new Date(Date.now() - KEEP_HOURS * 60 * 60 * 1000).toISOString());
}
