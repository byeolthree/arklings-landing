// 운영자 · 사용 기록 화면의 내용(서버 컴포넌트). app/admin/usage/page.tsx가 그린다. 모양은 /admin(협업 신청 현황)과 같은 결을 따른다.
import Link from "next/link";
import {
  USAGE_EVENT_KEYS,
  USAGE_EVENT_LABELS,
  USAGE_PAGE_SIZE,
  USAGE_PERIODS,
  usageHref,
  type UsageLoad,
  type UsagePeriod,
  type UsageQuery,
  type UsageRow,
  type UsageSort,
} from "@/lib/measure/admin";
import { formatKstShort } from "@/lib/time";

const cardCls = "rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]";
const selectCls = "h-11 w-full rounded-md border border-[#e8dfe3] bg-white px-2.5 text-[13px] text-title";
const COLS = "grid grid-cols-[170px_minmax(160px,1fr)_minmax(140px,1.2fr)_96px] gap-2";
const SORT_LABEL: Record<UsageSort, string> = { time: "시각", event: "행동", page: "페이지", user: "로그인 여부" };

export function UsageView({ q, load }: { q: UsageQuery; load: UsageLoad }) {
  return (
    <div className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-20 pt-6 md:px-20 md:pb-[120px] md:pt-10">
      <div className="flex flex-col gap-2">
        <Link href="/admin" className="text-[13px] text-body underline-offset-2 hover:underline">← 운영자 · 협업 신청 현황</Link>
        <h1 className="text-[18px] font-bold leading-[26px] text-title md:text-[20px] md:leading-7">운영자 · 사용 기록</h1>
        <p className="text-[13px] leading-5 text-body md:text-[14px] md:leading-[22px]">화면이 어떻게 쓰이는지 정해진 행동 7가지를 셉니다. 글 내용·이메일·이름은 기록하지 않아 여기에도 없어요.</p>
      </div>

      {load.ok === false ? (
        <div role="status" className="mt-6 rounded-xl border border-[#e8dfe3] bg-white px-6 py-12 text-center">
          {load.reason === "no_table" ? (
            <>
              <p className="text-[14px] font-medium text-title">사용 기록 표가 아직 없어요.</p>
              <p className="mt-2 text-[13px] leading-5 text-body">Supabase SQL Editor에서 <code>supabase/migrations/0021_usage_events.sql</code>을 실행한 뒤 이 화면을 새로 열어 주세요.</p>
            </>
          ) : (
            <p className="text-[14px] text-title">기록을 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.</p>
          )}
        </div>
      ) : (
        <>
          <CountCards counts={load.counts} total={load.periodTotal} period={q.period} />
          <PeriodForm q={q} />
          <Table q={q} rows={load.rows} total={load.total} />
        </>
      )}
    </div>
  );
}

function CountCards({ counts, total, period }: { counts: { event: (typeof USAGE_EVENT_KEYS)[number]; count: number }[]; total: number; period: UsagePeriod }) {
  return (
    <section aria-label="행동별 건수" className="mt-6">
      <p className="mb-3 text-[13px] text-body md:text-[14px]">{USAGE_PERIODS[period]} · 전체 <b className="text-title">{total}건</b></p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
        {counts.map((c) => (
          <div key={c.event} className={`${cardCls} flex flex-col gap-1 px-4 py-3.5 md:gap-1.5 md:px-6 md:py-5`}>
            <span className="text-[12px] font-medium text-title">{USAGE_EVENT_LABELS[c.event]}</span>
            <span className="text-[22px] font-bold leading-[30px] text-title md:text-[28px] md:leading-9">{c.count}건</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PeriodForm({ q }: { q: UsageQuery }) {
  return (
    <form method="get" action="/admin/usage" aria-label="기간 필터" className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-[#e8dfe3] bg-white p-5 md:px-6">
      <input type="hidden" name="sort" value={q.sort} />
      <input type="hidden" name="dir" value={q.dir} />
      <label className="flex w-full flex-col gap-1.5 md:w-60">
        <span className="text-[12px] font-medium leading-4 text-title">기간</span>
        <select name="period" defaultValue={q.period} className={selectCls}>
          {(Object.keys(USAGE_PERIODS) as UsagePeriod[]).map((k) => (<option key={k} value={k}>{USAGE_PERIODS[k]}</option>))}
        </select>
      </label>
      <div className="flex gap-2">
        <Link href="/admin/usage" className="inline-flex items-center justify-center rounded-lg border-[1.5px] border-jaju px-5 py-2 text-[13px] font-bold text-jaju">필터 초기화</Link>
        <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-jaju px-5 py-2 text-[13px] font-bold text-white">적용</button>
      </div>
    </form>
  );
}

function SortHead({ q, k }: { q: UsageQuery; k: UsageSort }) {
  const on = q.sort === k;
  const nextDir = on && q.dir === "asc" ? "desc" : "asc";
  return (
    <span role="columnheader" aria-sort={on ? (q.dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link scroll={false} href={usageHref(q, { sort: k, dir: on ? nextDir : k === "time" ? "desc" : "asc", page: 1 })} className={`inline-flex items-center gap-0.5 ${on ? "text-jaju" : "text-title"} hover:underline`}>
        {SORT_LABEL[k]}
        <span aria-hidden="true" className="text-[10px]">{on ? (q.dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </Link>
    </span>
  );
}

function Table({ q, rows, total }: { q: UsageQuery; rows: UsageRow[]; total: number }) {
  const pages = Math.max(1, Math.ceil(total / USAGE_PAGE_SIZE));
  const first = total === 0 ? 0 : (q.page - 1) * USAGE_PAGE_SIZE + 1;
  const last = Math.min(total, q.page * USAGE_PAGE_SIZE);
  return (
    <section aria-label="사용 기록 표" className="mt-6 flex flex-col gap-3">
      <p className="text-[13px] text-body md:text-[14px]">
        <b className="text-title">{total}건</b> 중 {first}–{last}번째 · {SORT_LABEL[q.sort]} {q.dir === "asc" ? "오름차순" : "내림차순"}
      </p>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-[#e8dfe3] bg-white px-6 py-14 text-center text-[14px] text-title">이 기간에 기록된 행동이 없어요.</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-[#e8dfe3] bg-white md:block">
            <div role="table" aria-label="사용 기록" className="min-w-[640px]">
              <div role="row" className={`${COLS} items-center border-b border-[#e8dfe3] bg-background px-4 py-3 text-[12px] font-medium`}>
                <SortHead q={q} k="time" />
                <SortHead q={q} k="event" />
                <SortHead q={q} k="page" />
                <SortHead q={q} k="user" />
              </div>
              {rows.map((r) => (
                <div key={r.id} role="row" className={`${COLS} items-center border-b border-[#e8dfe3] px-4 py-3 text-[13px] leading-5 text-body last:border-b-0`}>
                  <span role="cell">{formatKstShort(r.created_at)}</span>
                  <span role="cell" className="font-medium text-title">{USAGE_EVENT_LABELS[r.event]}</span>
                  <span role="cell" className="break-all">{r.page ?? "—"}</span>
                  <span role="cell">{r.loggedIn ? "로그인" : "비로그인"}</span>
                </div>
              ))}
            </div>
          </div>
          <MobileSort q={q} />
          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 rounded-xl border border-[#e8dfe3] bg-white px-4 py-3.5 text-[12px] leading-[18px] text-body">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-title">{USAGE_EVENT_LABELS[r.event]}</span>
                  <span>{r.loggedIn ? "로그인" : "비로그인"}</span>
                </div>
                <div>{formatKstShort(r.created_at)}</div>
                <div className="break-all">{r.page ?? "—"}</div>
              </li>
            ))}
          </ul>
        </>
      )}
      {pages > 1 && (
        <nav className="mt-2 flex items-center justify-center gap-4 text-[13px]" aria-label="쪽 이동">
          {q.page > 1 ? <Link href={usageHref(q, { page: q.page - 1 })} className="text-jaju">← 이전</Link> : <span className="opacity-40">← 이전</span>}
          <span>{q.page} / {pages}</span>
          {q.page < pages ? <Link href={usageHref(q, { page: q.page + 1 })} className="text-jaju">다음 →</Link> : <span className="opacity-40">다음 →</span>}
        </nav>
      )}
    </section>
  );
}

// 모바일은 표 머리글이 없으므로 정렬 기준을 눌러 바꾸는 줄을 따로 둔다
function MobileSort({ q }: { q: UsageQuery }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px] md:hidden" aria-label="정렬">
      <span className="text-body">정렬</span>
      {(Object.keys(SORT_LABEL) as UsageSort[]).map((k) => (
        <SortHead key={k} q={q} k={k} />
      ))}
    </div>
  );
}
