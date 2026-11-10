import { ROLES, STATUSES, type Role, type Status } from "@/lib/collab";
import { createAuthClient } from "@/lib/supabase/server";

// 운영자 화면(/admin)이 읽는 협업 신청 기록. DB의 collab_log(0016)만 읽고, 로그인한 본인의 권한(RLS)으로 읽는다.
// 운영자 표시(admins)가 없는 계정은 DB가 한 줄도 돌려주지 않는다. 내용·연락처·첨부는 이 기록에 없다.

export const ADMIN_PAGE_SIZE = 20;

export type LogRow = {
  request_id: string;
  created_at: string;
  recipient_kind: "arklings" | "user";
  recipient_name: string;
  applicant_name: string;
  target_kind: "plan" | "work" | "creator" | "general";
  target_text: string;
  roles: Role[];
  status: Status;
  status_changed_at: string | null;
  first_response_at: string | null;
  reply_count: number;
  request_deleted_at: string | null;
  hidden_at: string | null;
};

// 정렬 열: 주소의 sort 값 → DB 열 이름
export const SORT_COLUMNS = {
  created: "created_at",
  recipient: "recipient_name",
  target: "target_text",
  status: "status",
  changed: "status_changed_at",
  reply: "reply_count",
  applicant: "applicant_name",
} as const;
export type SortKey = keyof typeof SORT_COLUMNS;

export const TARGET_KINDS = { plan: "기획안", work: "작품", creator: "크리에이터", general: "전체 협업 제안" } as const;
export const PERIODS = { "7": "최근 7일", "30": "최근 30일", "90": "최근 90일", all: "전체" } as const;
export type PeriodKey = keyof typeof PERIODS;

export type AdminQuery = {
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
  period: PeriodKey;
  kind?: "arklings" | "user";
  recipient?: string;
  status?: Status;
  role?: Role;
  target?: keyof typeof TARGET_KINDS;
  reply?: "yes" | "no";
  stale?: boolean; // 3일 넘게 접수 상태
  q?: string;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// 주소의 값을 믿지 않고 허용 목록으로만 받는다.
export function parseAdminQuery(sp: Record<string, string | string[] | undefined>): AdminQuery {
  const sortRaw = one(sp.sort);
  const sort: SortKey = sortRaw && sortRaw in SORT_COLUMNS ? (sortRaw as SortKey) : "created";
  const dir = one(sp.dir) === "asc" ? "asc" : "desc";
  const periodRaw = one(sp.period);
  const period: PeriodKey = periodRaw && periodRaw in PERIODS ? (periodRaw as PeriodKey) : "30";
  const kindRaw = one(sp.kind);
  const statusRaw = one(sp.status);
  const roleRaw = one(sp.role);
  const targetRaw = one(sp.target);
  const replyRaw = one(sp.reply);
  const recipient = (one(sp.recipient) ?? "").trim().slice(0, 60);
  const q = (one(sp.q) ?? "").trim().slice(0, 60);
  return {
    sort,
    dir,
    page: Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1),
    period,
    kind: kindRaw === "arklings" || kindRaw === "user" ? kindRaw : undefined,
    recipient: recipient || undefined,
    status: statusRaw && statusRaw in STATUSES ? (statusRaw as Status) : undefined,
    role: roleRaw && roleRaw in ROLES ? (roleRaw as Role) : undefined,
    target: targetRaw && targetRaw in TARGET_KINDS ? (targetRaw as keyof typeof TARGET_KINDS) : undefined,
    reply: replyRaw === "yes" || replyRaw === "no" ? replyRaw : undefined,
    stale: one(sp.stale) === "1",
    q: q || undefined,
  };
}

// 현재 조건을 주소 글자로 되돌린다(머리글 정렬 링크·쪽 이동이 조건을 그대로 들고 가게).
export function adminHref(q: AdminQuery, patch: Partial<AdminQuery> = {}): string {
  const m = { ...q, ...patch };
  const p = new URLSearchParams();
  if (m.sort !== "created") p.set("sort", m.sort);
  if (m.dir !== "desc") p.set("dir", m.dir);
  if (m.period !== "30") p.set("period", m.period);
  if (m.kind) p.set("kind", m.kind);
  if (m.recipient) p.set("recipient", m.recipient);
  if (m.status) p.set("status", m.status);
  if (m.role) p.set("role", m.role);
  if (m.target) p.set("target", m.target);
  if (m.reply) p.set("reply", m.reply);
  if (m.stale) p.set("stale", "1");
  if (m.q) p.set("q", m.q);
  if (m.page > 1) p.set("page", String(m.page));
  const s = p.toString();
  return `/admin${s ? `?${s}` : ""}`;
}

function periodStart(period: PeriodKey, now = new Date()): string | null {
  if (period === "all") return null;
  return new Date(now.getTime() - Number(period) * 24 * 3600 * 1000).toISOString();
}

export type AdminLoad =
  | { ok: true; rows: LogRow[]; total: number; recipients: string[] }
  | { ok: false; reason: "not_admin" | "no_table" | "error" };

// 오류 글에서 「표가 없다」를 알아본다(0016 실행 전).
function isMissingTable(e: { code?: string; message?: string }): boolean {
  return e.code === "42P01" || e.code === "PGRST205" || /collab_log/.test(e.message ?? "") && /does not exist|schema cache/i.test(e.message ?? "");
}

export async function isAdminUser(): Promise<boolean> {
  try {
    const { data, error } = await (await createAuthClient()).rpc("is_admin");
    return !error && data === true;
  } catch {
    return false;
  }
}

// 표 한 쪽을 읽는다. 정렬·조건은 모두 DB가 처리한다. 목록에서 치운 줄(hidden_at)은 빼고 읽는다.
export async function loadAdminRows(q: AdminQuery): Promise<AdminLoad> {
  const sb = await createAuthClient();
  const from = (q.page - 1) * ADMIN_PAGE_SIZE;
  let query = sb
    .from("collab_log")
    .select("*", { count: "exact" })
    .is("hidden_at", null)
    .order(SORT_COLUMNS[q.sort], { ascending: q.dir === "asc", nullsFirst: false })
    .order("request_id", { ascending: true })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  const start = periodStart(q.period);
  if (start) query = query.gte("created_at", start);
  if (q.kind) query = query.eq("recipient_kind", q.kind);
  if (q.recipient) query = query.eq("recipient_name", q.recipient);
  if (q.status) query = query.eq("status", q.status);
  if (q.role) query = query.contains("roles", [q.role]);
  if (q.target) query = query.eq("target_kind", q.target);
  if (q.reply === "yes") query = query.gt("reply_count", 0);
  if (q.reply === "no") query = query.eq("reply_count", 0);
  if (q.stale) query = query.eq("status", "received").lt("created_at", new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString());
  if (q.q) {
    // or() 안에서 쉼표·괄호·% 같은 글자는 조건 문법으로 읽히므로 뺀다.
    const safe = q.q.replace(/[,()%*\\"']/g, " ").trim();
    if (safe) query = query.or(`applicant_name.ilike.%${safe}%,recipient_name.ilike.%${safe}%,target_text.ilike.%${safe}%`);
  }

  const { data, count, error } = await query;
  if (error) {
    if (isMissingTable(error)) return { ok: false, reason: "no_table" };
    console.error("[admin] 협업 기록을 읽지 못했습니다.", error);
    return { ok: false, reason: "error" };
  }

  // 받는 사람 선택 목록(기록에 나온 이름들)
  const names = await sb.from("collab_log").select("recipient_name").limit(2000);
  const recipients = Array.from(new Set((names.data ?? []).map((r) => r.recipient_name as string))).sort((a, b) => a.localeCompare(b, "ko"));
  return { ok: true, rows: (data ?? []) as LogRow[], total: count ?? 0, recipients };
}

export type Metrics = {
  total: number;
  byStatus: { status: Status; count: number; pct: number }[];
  acceptRate: number | null; // 수락 ÷ (수락+거절), 결과가 없으면 null
  decided: number;
  medianResponseMs: number | null;
  staleCount: number; // 3일 넘게 접수 상태
  weekly: { label: string; n: number }[]; // 오래된 주부터
  recipients: { name: string; sent: number; rate: number }[]; // 처리율 = 접수 상태를 벗어난 신청 ÷ 받은 신청
  truncated: boolean;
};

const WEEK_MS = 7 * 24 * 3600 * 1000;
const METRIC_LIMIT = 5000;

// 지표는 목록에서 치운 줄도 센다(「기록은 남는다」). 최대 5000건까지만 읽고, 넘으면 truncated로 알린다.
export async function loadMetrics(period: PeriodKey): Promise<Metrics | null> {
  const sb = await createAuthClient();
  let query = sb
    .from("collab_log")
    .select("status, created_at, first_response_at, recipient_kind, recipient_name")
    .order("created_at", { ascending: false })
    .limit(METRIC_LIMIT);
  const start = periodStart(period);
  if (start) query = query.gte("created_at", start);
  const { data, error } = await query;
  if (error) return null;
  const rows = (data ?? []) as Pick<LogRow, "status" | "created_at" | "first_response_at" | "recipient_kind" | "recipient_name">[];

  const now = Date.now();
  const counts: Record<Status, number> = { received: 0, reviewing: 0, accepted: 0, rejected: 0 };
  const resp: number[] = [];
  let stale = 0;
  const per = new Map<string, { sent: number; done: number }>();
  const weeks = Array.from({ length: 8 }, () => 0);
  for (const r of rows) {
    counts[r.status] += 1;
    const created = new Date(r.created_at).getTime();
    if (r.first_response_at) {
      const d = new Date(r.first_response_at).getTime() - created;
      if (d >= 0) resp.push(d);
    }
    if (r.status === "received" && now - created > 3 * 24 * 3600 * 1000) stale += 1;
    const p = per.get(r.recipient_name) ?? { sent: 0, done: 0 };
    p.sent += 1;
    if (r.status !== "received") p.done += 1;
    per.set(r.recipient_name, p);
    const w = Math.floor((now - created) / WEEK_MS);
    if (w >= 0 && w < 8) weeks[w] += 1;
  }
  resp.sort((a, b) => a - b);
  const median = resp.length === 0 ? null : resp.length % 2 ? resp[(resp.length - 1) / 2] : (resp[resp.length / 2 - 1] + resp[resp.length / 2]) / 2;
  const total = rows.length;
  const decided = counts.accepted + counts.rejected;
  const kst = (t: number) => new Date(t + 9 * 3600 * 1000).toISOString().slice(5, 10).replace("-", "/");

  const sorted = Array.from(per.entries()).sort((a, b) => b[1].sent - a[1].sent);
  const top = sorted.slice(0, 5).map(([name, v]) => ({ name, sent: v.sent, rate: Math.round((v.done / v.sent) * 100) }));
  const rest = sorted.slice(5);
  if (rest.length > 0) {
    const sent = rest.reduce((s, [, v]) => s + v.sent, 0);
    const done = rest.reduce((s, [, v]) => s + v.done, 0);
    top.push({ name: `나머지 ${rest.length}명`, sent, rate: Math.round((done / sent) * 100) });
  }

  return {
    total,
    byStatus: (Object.keys(STATUSES) as Status[]).map((s) => ({ status: s, count: counts[s], pct: total ? Math.round((counts[s] / total) * 100) : 0 })),
    acceptRate: decided ? Math.round((counts.accepted / decided) * 100) : null,
    decided,
    medianResponseMs: median,
    staleCount: stale,
    weekly: weeks.map((n, i) => ({ label: kst(now - (i + 1) * WEEK_MS + 24 * 3600 * 1000), n })).reverse(),
    recipients: top,
    truncated: rows.length >= METRIC_LIMIT,
  };
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.max(1, Math.round(ms / 60000))}분`;
  const d = Math.floor(h / 24);
  return d > 0 ? `${d}일 ${h % 24}시간` : `${h}시간`;
}
