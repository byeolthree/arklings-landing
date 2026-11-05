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

// 횟수 표를 못 쓰는 이유를 가려 알리기 위한 오류. table_missing = 이 DB에 submit_attempts 표가 없다(0003을 아직 안 넣음).
// 표가 없는 것은 「너무 많이 보낸 것」이 아니다. 그래서 호출하는 쪽이 따로 다룬다.
export class RateLimitUnavailable extends Error {
  constructor(
    public reason: "table_missing" | "unknown",
    message: string,
  ) {
    super(message);
    this.name = "RateLimitUnavailable";
  }
}

// PostgREST: PGRST205(스키마 캐시에 표 없음), Postgres: 42P01(표 없음)
const isMissingTable = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === "PGRST205" || e.code === "42P01" || /schema cache|does not exist|Could not find the table/i.test(e.message ?? ""));

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
    if (isMissingTable(error)) throw new RateLimitUnavailable("table_missing", error?.message ?? "submit_attempts 표가 없어요");
    // head 요청은 표가 없어도 오류 없이 count가 비어 올 수 있다. 그럴 때는 한 줄 읽어 보며 표가 있는지 확인한다.
    if (!error && count === null) {
      const probe = await sb.from("submit_attempts").select("id").limit(1);
      if (isMissingTable(probe.error)) throw new RateLimitUnavailable("table_missing", probe.error?.message ?? "submit_attempts 표가 없어요");
    }
    // 그 밖에 횟수를 확인하지 못하면(오류이거나 숫자를 못 받으면) 통과시키지 않고 접수를 멈춘다(안전한 쪽으로 닫힘).
    if (error || count === null) throw new RateLimitUnavailable("unknown", error?.message ?? "count unavailable");
    return count;
  };
  const [hour, day] = await Promise.all([count(60 * 60 * 1000), count(24 * 60 * 60 * 1000)]);
  return hour >= LIMIT_PER_HOUR || day >= LIMIT_PER_DAY;
}

export async function recordAttempt(key: string): Promise<void> {
  const sb = createAdminClient();
  const ins = await sb.from("submit_attempts").insert({ ip_hash: key });
  if (isMissingTable(ins.error)) throw new RateLimitUnavailable("table_missing", ins.error?.message ?? "submit_attempts 표가 없어요");
  if (ins.error) throw new RateLimitUnavailable("unknown", ins.error.message);
  // 오래된 기록은 지나가는 김에 정리한다.
  await sb.from("submit_attempts").delete().lt("created_at", new Date(Date.now() - KEEP_HOURS * 60 * 60 * 1000).toISOString());
}
