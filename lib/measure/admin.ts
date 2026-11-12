// 운영자용 사용 기록 읽기(서버 전용). /admin/usage 화면이 lib/measure/server.ts를 거쳐 쓴다.
// 읽기는 로그인한 운영자 본인의 연결로 한다(서버 전용 열쇠 없음). 읽기 권한은 0021의 정책(is_admin())이 DB에서 막는다.
// 화면에는 시각·행동·화면 경로·로그인 여부만 내보낸다. 회원 번호(user_id)·브라우저 무작위 값(anon_id)·부가 값은 화면에 보내지 않는다.
import { USAGE_EVENTS, type UsageEvent } from "@/lib/measure/events";
import { createAuthClient } from "@/lib/supabase/server";

export const USAGE_PAGE_SIZE = 20;

export const USAGE_EVENT_LABELS: Record<UsageEvent, string> = {
  planner_open: "기획안 화면 열기",
  plan_save: "기획안 저장",
  ai_evaluate_click: "AI 평가 누르기",
  library_ask: "라이브러리 질문",
  portfolio_start_click: "포트폴리오 작성하기 누르기",
  signup: "가입",
  login: "로그인",
};
export const USAGE_EVENT_KEYS = Object.keys(USAGE_EVENTS) as UsageEvent[];

export const USAGE_PERIODS = { "7": "최근 7일", "30": "최근 30일", "90": "최근 90일", all: "전체" } as const;
export type UsagePeriod = keyof typeof USAGE_PERIODS;

export const USAGE_SORTS = ["time", "event", "page", "user"] as const;
export type UsageSort = (typeof USAGE_SORTS)[number];
const SORT_COLUMN: Record<UsageSort, string> = { time: "created_at", event: "event", page: "page", user: "user_id" };

export type UsageQuery = { sort: UsageSort; dir: "asc" | "desc"; page: number; period: UsagePeriod };
export type UsageRow = { id: string; created_at: string; event: UsageEvent; page: string | null; loggedIn: boolean };
export type UsageLoad =
  | { ok: true; rows: UsageRow[]; total: number; counts: { event: UsageEvent; count: number }[]; periodTotal: number }
  | { ok: false; reason: "no_table" | "error" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// 주소의 값을 검사해 정해진 값만 받는다(그 밖의 값은 기본값).
export function parseUsageQuery(sp: Record<string, string | string[] | undefined>): UsageQuery {
  const sortRaw = one(sp.sort);
  const sort = (USAGE_SORTS as readonly string[]).includes(sortRaw ?? "") ? (sortRaw as UsageSort) : "time";
  const dirRaw = one(sp.dir);
  const dir = dirRaw === "asc" || dirRaw === "desc" ? dirRaw : sort === "time" ? "desc" : "asc";
  const periodRaw = one(sp.period);
  const period: UsagePeriod = periodRaw && periodRaw in USAGE_PERIODS ? (periodRaw as UsagePeriod) : "30";
  const pageNum = Number(one(sp.page));
  const page = Number.isInteger(pageNum) && pageNum >= 1 && pageNum <= 10000 ? pageNum : 1;
  return { sort, dir, page, period };
}

export function usageHref(q: UsageQuery, patch: Partial<UsageQuery> = {}): string {
  const m = { ...q, ...patch };
  const p = new URLSearchParams();
  if (m.sort !== "time") p.set("sort", m.sort);
  if (m.dir !== (m.sort === "time" ? "desc" : "asc")) p.set("dir", m.dir);
  if (m.period !== "30") p.set("period", m.period);
  if (m.page > 1) p.set("page", String(m.page));
  const s = p.toString();
  return `/admin/usage${s ? `?${s}` : ""}`;
}

function sinceIso(period: UsagePeriod): string | null {
  return period === "all" ? null : new Date(Date.now() - Number(period) * 24 * 3600 * 1000).toISOString();
}

type RawRow = { id: string; created_at: string; event: string; page: string | null; user_id: string | null };

export async function loadUsage(q: UsageQuery): Promise<UsageLoad> {
  try {
    const sb = await createAuthClient();
    const since = sinceIso(q.period);
    const base = () => {
      let b = sb.from("usage_events").select("id, created_at, event, page, user_id", { count: "exact" });
      if (since) b = b.gte("created_at", since);
      return b;
    };
    const from = (q.page - 1) * USAGE_PAGE_SIZE;
    const asc = q.dir === "asc";
    // 행동별 건수는 행동마다 건수만 센다(내용을 가져오지 않는다)
    const countQueries = USAGE_EVENT_KEYS.map((ev) => {
      let b = sb.from("usage_events").select("id", { count: "exact", head: true }).eq("event", ev);
      if (since) b = b.gte("created_at", since);
      return b;
    });
    const [listRes, ...countRes] = await Promise.all([
      base().order(SORT_COLUMN[q.sort], { ascending: asc, nullsFirst: asc }).order("created_at", { ascending: false }).order("id").range(from, from + USAGE_PAGE_SIZE - 1),
      ...countQueries,
    ]);
    const err = listRes.error ?? countRes.find((r) => r.error)?.error;
    if (err) {
      const msg = `${err.code ?? ""} ${err.message ?? ""}`;
      return { ok: false, reason: /42P01|PGRST205|usage_events/i.test(msg) ? "no_table" : "error" };
    }
    const counts = USAGE_EVENT_KEYS.map((event, i) => ({ event, count: countRes[i].count ?? 0 }));
    const rows: UsageRow[] = ((listRes.data ?? []) as RawRow[])
      .filter((r): r is RawRow & { event: UsageEvent } => r.event in USAGE_EVENTS)
      .map((r) => ({ id: r.id, created_at: r.created_at, event: r.event, page: r.page, loggedIn: r.user_id !== null }));
    return { ok: true, rows, total: listRes.count ?? 0, counts, periodTotal: counts.reduce((a, c) => a + c.count, 0) };
  } catch {
    return { ok: false, reason: "error" };
  }
}
