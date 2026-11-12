import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteRowButton } from "@/components/admin/delete-row-button";
import { StatusBadge } from "@/components/status-badge";
import {
  ADMIN_PAGE_SIZE,
  adminHref,
  formatDuration,
  isAdminUser,
  loadAdminRows,
  loadMetrics,
  parseAdminQuery,
  PERIODS,
  TARGET_KINDS,
  type AdminQuery,
  type LogRow,
  type Metrics,
  type SortKey,
} from "@/lib/admin-collab";
import { requireUser } from "@/lib/auth";
import { MEASURE_ENABLED } from "@/lib/measure/server";
import { ROLES, STATUSES, type Role, type Status } from "@/lib/collab";
import { formatKstShort } from "@/lib/time";

export const metadata: Metadata = { title: "운영자 · 협업 신청 현황", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic"; // 로그인·운영자 확인과 최신 기록을 요청 때마다 확인한다

type SP = Promise<Record<string, string | string[] | undefined>>;

const STATUS_BAR: Record<Status, string> = { received: "#5f7c99", reviewing: "#d89a24", accepted: "#16794b", rejected: "#c83a3a" };
const selectCls = "h-11 w-full rounded-md border border-[#e8dfe3] bg-white px-2.5 text-[13px] text-title";
const labelCls = "text-[12px] font-medium leading-4 text-title";
const cardCls = "rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]";
// 표 칸 너비(데스크톱): 접수 시각 / 받는 사람 / 대상 / 역할 / 상태 / 상태 바뀐 시각 / 답장 / 신청자 / 삭제
const COLS = "grid grid-cols-[96px_140px_minmax(120px,1.2fr)_110px_96px_110px_64px_minmax(100px,1fr)_84px] gap-2";

const staleDays = (r: LogRow) =>
  r.status === "received" && !r.request_deleted_at ? Math.floor((Date.now() - new Date(r.created_at).getTime()) / (24 * 3600 * 1000)) : 0;

export default async function AdminPage({ searchParams }: { searchParams: SP }) {
  await requireUser("/admin");
  // 운영자 표시가 없는 계정에는 이 화면이 있다는 것도 알리지 않는다.
  if (!(await isAdminUser())) notFound();

  const q = parseAdminQuery(await searchParams);
  const [list, metrics] = await Promise.all([loadAdminRows(q), loadMetrics(q.period)]);

  return (
    <div className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-20 pt-6 md:px-20 md:pb-[120px] md:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-[18px] font-bold leading-[26px] text-title md:text-[20px] md:leading-7">운영자 · 협업 신청 현황</h1>
          <p className="text-[13px] leading-5 text-body md:text-[14px] md:leading-[22px]">누가 누구에게 보냈는지, 협업이 얼마나 원활하게 진행되는지 한눈에 봅니다.</p>
        </div>
        {MEASURE_ENABLED && (
          <Link href="/admin/usage" className="inline-flex items-center justify-center rounded-lg border-[1.5px] border-jaju px-5 py-2 text-[13px] font-bold text-jaju">사용 기록 보기</Link>
        )}
      </div>

      <p className={`${cardCls} mt-6 border border-[#e8dfe3] px-5 py-4 text-[12px] leading-[18px] text-body shadow-none md:text-[13px] md:leading-5`}>
        아클링스 앞으로 온 신청은 「신청자 이름」을 눌러 내용까지 볼 수 있어요. <b className="font-medium text-title">다른 사람 앞으로 온 신청</b>은 연락처·내용·첨부를 이 화면에서 볼 수 없고, 누가 누구에게·언제·어떤 상태인지만 보여요.
      </p>

      {list.ok === false ? (
        <Notice reason={list.reason} />
      ) : (
        <>
          {metrics ? <MetricsBlock m={metrics} /> : null}
          <FilterForm q={q} recipients={list.recipients} />
          <TableBlock q={q} rows={list.rows} total={list.total} />
        </>
      )}
    </div>
  );
}

function Notice({ reason }: { reason: "not_admin" | "no_table" | "error" }) {
  return (
    <div role="status" className="mt-6 rounded-xl border border-[#e8dfe3] bg-white px-6 py-12 text-center">
      {reason === "no_table" ? (
        <>
          <p className="text-[14px] font-medium text-title">운영자 기록 표가 아직 없어요.</p>
          <p className="mt-2 text-[13px] leading-5 text-body">Supabase SQL Editor에서 <code>supabase/migrations/0016_admin_collab_log.sql</code>을 실행한 뒤 이 화면을 새로 열어 주세요.</p>
        </>
      ) : (
        <p className="text-[14px] text-title">기록을 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.</p>
      )}
    </div>
  );
}

function MetricsBlock({ m }: { m: Metrics }) {
  const cards = [
    { label: "전체 신청", value: `${m.total}건`, note: m.truncated ? "최근 5000건까지만 셈" : "선택한 기간", color: "text-title" },
    { label: "수락률", value: m.acceptRate === null ? "-" : `${m.acceptRate}%`, note: `수락 ÷ 결과가 나온 ${m.decided}건 (수락+거절)`, color: "text-[#16794b]" },
    { label: "첫 응답까지 걸린 시간", value: formatDuration(m.medianResponseMs), note: "접수부터 처음 응답까지 · 중앙값", color: "text-title" },
    { label: "3일 넘게 접수 상태", value: `${m.staleCount}건`, note: "아직 아무도 응답하지 않은 신청", color: "text-[#b45309]" },
  ];
  const max = Math.max(1, ...m.weekly.map((w) => w.n));
  return (
    <>
      <section aria-label="핵심 지표" className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
        {cards.map((c) => (
          <div key={c.label} className={`${cardCls} flex flex-col gap-1 px-4 py-3.5 md:gap-1.5 md:px-6 md:py-5`}>
            <span className="text-[12px] font-medium text-title">{c.label}</span>
            <span className={`text-[22px] font-bold leading-[30px] md:text-[28px] md:leading-9 ${c.color}`}>{c.value}</span>
            <span className="text-[11px] leading-4 text-body md:text-[12px] md:leading-[18px]">{c.note}</span>
          </div>
        ))}
      </section>

      <section aria-label="진행 현황" className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-6">
        <div className={`${cardCls} flex flex-col gap-4 p-5 md:p-6`}>
          <h2 className="text-[15px] font-bold text-title md:text-[18px]">상태별 비율</h2>
          <div className="flex h-4 overflow-hidden rounded-md bg-[#e8dfe3] md:h-5" role="img" aria-label={m.byStatus.map((s) => `${STATUSES[s.status]} ${s.count}건`).join(", ")}>
            {m.byStatus.map((s) => (
              <div key={s.status} style={{ width: `${s.pct}%`, background: STATUS_BAR[s.status] }} />
            ))}
          </div>
          <ul className="flex flex-col gap-2 text-[13px]">
            {m.byStatus.map((s) => (
              <li key={s.status} className="flex items-center gap-2">
                <span className="size-3 flex-none rounded-[3px]" style={{ background: STATUS_BAR[s.status] }} />
                <span className="flex-1 text-title">{STATUSES[s.status]}</span>
                <span className="text-body">{s.count}건 · {s.pct}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${cardCls} flex flex-col gap-4 p-5 md:p-6`}>
          <h2 className="text-[15px] font-bold text-title md:text-[18px]">주별 신청 수</h2>
          <div className="flex h-[140px] items-end gap-2 border-b border-[#e8dfe3]">
            {m.weekly.map((w, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[11px] text-body">{w.n}</span>
                <div className="w-full rounded-t bg-teal" style={{ height: `${Math.round((w.n / max) * 100)}px` }} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 text-[11px] text-body">
            {m.weekly.map((w, i) => (
              <span key={i} className="flex-1 text-center">{w.label}</span>
            ))}
          </div>
        </div>

        <div className={`${cardCls} flex flex-col gap-4 p-5 md:p-6`}>
          <h2 className="text-[15px] font-bold text-title md:text-[18px]">받는 사람별 처리율</h2>
          <p className="text-[12px] leading-[18px] text-body">처리율 = 접수 상태를 벗어난 신청 ÷ 받은 신청</p>
          {m.recipients.length === 0 ? (
            <p className="text-[13px] text-body">아직 기록이 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-3 text-[13px]">
              {m.recipients.map((p) => (
                <li key={p.name} className="flex flex-col gap-1">
                  <div className="flex justify-between gap-2"><span className="text-title">{p.name}</span><span className="text-body">{p.sent}건 · {p.rate}%</span></div>
                  <div className="h-2 overflow-hidden rounded bg-[#e8dfe3]"><div className="h-full bg-teal" style={{ width: `${p.rate}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function FilterForm({ q, recipients }: { q: AdminQuery; recipients: string[] }) {
  return (
    <form method="get" action="/admin" aria-label="필터" className="mt-6 flex flex-col gap-4 rounded-xl border border-[#e8dfe3] bg-white p-5 md:px-6">
      <input type="hidden" name="sort" value={q.sort} />
      <input type="hidden" name="dir" value={q.dir} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>받는 사람 종류</span>
          <select name="kind" defaultValue={q.kind ?? ""} className={selectCls}>
            <option value="">전체</option>
            <option value="arklings">아클링스</option>
            <option value="user">사용자</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>받는 사람</span>
          <select name="recipient" defaultValue={q.recipient ?? ""} className={selectCls}>
            <option value="">전체</option>
            {recipients.map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>상태</span>
          <select name="status" defaultValue={q.status ?? ""} className={selectCls}>
            <option value="">전체</option>
            {(Object.keys(STATUSES) as Status[]).map((s) => (<option key={s} value={s}>{STATUSES[s]}</option>))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>역할</span>
          <select name="role" defaultValue={q.role ?? ""} className={selectCls}>
            <option value="">전체</option>
            {(Object.keys(ROLES) as Role[]).map((r) => (<option key={r} value={r}>{ROLES[r]}</option>))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>대상</span>
          <select name="target" defaultValue={q.target ?? ""} className={selectCls}>
            <option value="">전체</option>
            {(Object.keys(TARGET_KINDS) as (keyof typeof TARGET_KINDS)[]).map((k) => (<option key={k} value={k}>{TARGET_KINDS[k]}</option>))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>접수 기간</span>
          <select name="period" defaultValue={q.period} className={selectCls}>
            {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((k) => (<option key={k} value={k}>{PERIODS[k]}</option>))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>답장 여부</span>
          <select name="reply" defaultValue={q.reply ?? ""} className={selectCls}>
            <option value="">전체</option>
            <option value="yes">답장 있음</option>
            <option value="no">답장 없음</option>
          </select>
        </label>
        <label className="col-span-2 flex flex-col gap-1.5 md:col-span-3">
          <span className={labelCls}>검색 (신청자·받는 사람·대상)</span>
          <input type="search" name="q" defaultValue={q.q ?? ""} maxLength={60} className={`${selectCls} px-3`} />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[12px] text-body">
          <input type="checkbox" name="stale" value="1" defaultChecked={q.stale} /> 3일 넘게 접수 상태인 것만
        </label>
        <div className="flex gap-2">
          <Link href="/admin" className="inline-flex items-center justify-center rounded-lg border-[1.5px] border-jaju px-5 py-2 text-[13px] font-bold text-jaju">필터 초기화</Link>
          <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-jaju px-5 py-2 text-[13px] font-bold text-white">적용</button>
        </div>
      </div>
    </form>
  );
}

function SortHead({ q, k, children }: { q: AdminQuery; k: SortKey; children: React.ReactNode }) {
  const on = q.sort === k;
  const nextDir = on && q.dir === "asc" ? "desc" : "asc";
  return (
    <span role="columnheader" aria-sort={on ? (q.dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link scroll={false} href={adminHref(q, { sort: k, dir: on ? nextDir : "asc", page: 1 })} className={`inline-flex items-center gap-0.5 ${on ? "text-jaju" : "text-title"} hover:underline`}>
        {children}
        <span aria-hidden="true" className="text-[10px]">{on ? (q.dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </Link>
    </span>
  );
}

function StatusCell({ r }: { r: LogRow }) {
  return (
    <span className="flex flex-col items-start gap-1">
      <StatusBadge status={r.status} />
      {r.request_deleted_at && <span className="text-[11px] leading-4 text-body">받은 사람이 삭제함</span>}
    </span>
  );
}

function ApplicantCell({ r }: { r: LogRow }) {
  // 아클링스 앞 신청(아직 지워지지 않음)은 운영자가 받는 사람이라 내용 화면으로 간다.
  if (r.recipient_kind === "arklings" && !r.request_deleted_at) {
    return <Link href={`/collab/${r.request_id}`} className="font-medium text-title underline-offset-2 hover:underline">{r.applicant_name}</Link>;
  }
  return <span className="font-medium text-title">{r.applicant_name}</span>;
}

function Waiting({ r }: { r: LogRow }) {
  const d = staleDays(r);
  return d >= 3 ? <span className="text-[11px] font-medium text-[#b45309]">{d}일째 접수 상태</span> : null;
}

function TableBlock({ q, rows, total }: { q: AdminQuery; rows: LogRow[]; total: number }) {
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const first = total === 0 ? 0 : (q.page - 1) * ADMIN_PAGE_SIZE + 1;
  const last = Math.min(total, q.page * ADMIN_PAGE_SIZE);
  const sortLabel = { created: "접수 시각", recipient: "받는 사람", target: "대상", status: "상태", changed: "상태 바뀐 시각", reply: "답장", applicant: "신청자" } as const;
  return (
    <section aria-label="협업 신청 표" className="mt-6 flex flex-col gap-3">
      <p className="text-[13px] text-body md:text-[14px]">
        <b className="text-title">{total}건</b> 중 {first}–{last}번째 · {sortLabel[q.sort]} {q.dir === "asc" ? "오름차순" : "내림차순"}
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-[#e8dfe3] bg-white px-6 py-14 text-center text-[14px] text-title">조건에 맞는 신청이 없어요.</div>
      ) : (
        <>
          {/* 데스크톱: 표 */}
          <div className="hidden overflow-x-auto rounded-xl border border-[#e8dfe3] bg-white md:block">
            <div role="table" aria-label="협업 신청 목록" className="min-w-[1080px]">
              <div role="row" className={`${COLS} items-center border-b border-[#e8dfe3] bg-background px-4 py-3 text-[12px] font-medium`}>
                <SortHead q={q} k="created">접수 시각</SortHead>
                <SortHead q={q} k="recipient">받는 사람</SortHead>
                <SortHead q={q} k="target">대상</SortHead>
                <span role="columnheader" className="text-title">역할</span>
                <SortHead q={q} k="status">상태</SortHead>
                <SortHead q={q} k="changed">상태 바뀐 시각</SortHead>
                <SortHead q={q} k="reply">답장</SortHead>
                <SortHead q={q} k="applicant">신청자</SortHead>
                <span role="columnheader" className="text-title">삭제</span>
              </div>
              {rows.map((r) => (
                <div key={r.request_id} role="row" className={`${COLS} items-center border-b border-[#e8dfe3] px-4 py-3 text-[13px] leading-5 text-body last:border-b-0`}>
                  <span role="cell">{formatKstShort(r.created_at)}</span>
                  <span role="cell" className="flex flex-col"><span className="font-medium text-title">{r.recipient_name}</span><span className="text-[11px]">{r.recipient_kind === "arklings" ? "아클링스" : "사용자"}</span></span>
                  <span role="cell" className="break-words">{r.target_text}</span>
                  <span role="cell" className="break-words">{r.roles.map((x) => ROLES[x] ?? x).join(", ")}</span>
                  <span role="cell"><StatusCell r={r} /></span>
                  <span role="cell" className="flex flex-col">{r.status_changed_at ? formatKstShort(r.status_changed_at) : "—"}<Waiting r={r} /></span>
                  <span role="cell">{r.reply_count > 0 ? `있음 ${r.reply_count}` : "없음"}</span>
                  <span role="cell" className="min-w-0 break-words"><ApplicantCell r={r} /></span>
                  <span role="cell"><DeleteRowButton id={r.request_id} real={r.recipient_kind === "arklings" && !r.request_deleted_at} /></span>
                </div>
              ))}
            </div>
          </div>

          {/* 모바일: 카드 */}
          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map((r) => (
              <li key={r.request_id} className="flex flex-col gap-2 rounded-xl border border-[#e8dfe3] bg-white px-4 py-3.5 text-[12px] leading-[18px] text-body">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-title">{r.recipient_name} <span className="text-[11px] font-normal">· {r.recipient_kind === "arklings" ? "아클링스" : "사용자"}</span></span>
                  <StatusCell r={r} />
                </div>
                <div>{r.target_text} · {r.roles.map((x) => ROLES[x] ?? x).join(", ")}</div>
                <div>접수 {formatKstShort(r.created_at)} · 상태 바뀐 시각 {r.status_changed_at ? formatKstShort(r.status_changed_at) : "—"} · 답장 {r.reply_count > 0 ? `있음 ${r.reply_count}` : "없음"}</div>
                <Waiting r={r} />
                <div className="flex items-center justify-between gap-2">
                  <ApplicantCell r={r} />
                  <DeleteRowButton id={r.request_id} real={r.recipient_kind === "arklings" && !r.request_deleted_at} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {pages > 1 && (
        <nav className="mt-2 flex items-center justify-center gap-4 text-[13px]" aria-label="쪽 이동">
          {q.page > 1 ? <Link href={adminHref(q, { page: q.page - 1 })} className="text-jaju">← 이전</Link> : <span className="opacity-40">← 이전</span>}
          <span>{q.page} / {pages}</span>
          {q.page < pages ? <Link href={adminHref(q, { page: q.page + 1 })} className="text-jaju">다음 →</Link> : <span className="opacity-40">다음 →</span>}
        </nav>
      )}
    </section>
  );
}
