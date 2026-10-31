import type { Metadata } from "next";
import Link from "next/link";
import { PaperCard, PaperPage } from "@/components/paper-card";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/server";
import { formatKstDate } from "@/lib/time";
import { PAGE_SIZE, ROLES, STATUSES, type CollabRequest, type Status } from "@/lib/collab";

export const metadata: Metadata = { title: "받은 협업 신청", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic"; // 로그인 확인과 최신 목록을 요청 때마다 확인한다

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CollabListPage({ searchParams }: { searchParams: SP }) {
  await requireUser("/collab");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1);
  const statusParam = one(sp.status);
  const status = statusParam && statusParam in STATUSES ? statusParam : undefined;
  const from = (page - 1) * PAGE_SIZE;

  // 로그인한 본인의 권한으로 읽는다. DB 규칙(RLS)이 "나에게 온 신청"만 돌려준다.
  let q = (await createAuthClient())
    .from("collab_requests")
    .select("*, source_works(title), plans(title)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (status) q = q.eq("status", status);
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as CollabRequest[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number, s = status) => {
    const qs = new URLSearchParams();
    if (s) qs.set("status", s);
    if (p > 1) qs.set("page", String(p));
    const t = qs.toString();
    return `/collab${t ? `?${t}` : ""}`;
  };
  const chip = (on: boolean) =>
    `rounded-[20px] border px-3 py-1.5 text-[13px] ${on ? "border-jaju font-medium text-jaju" : "border-[#e8dfe3] text-[#6f6469]"}`;

  return (
    <PaperPage wide>
      <PaperCard className="!px-5 md:!p-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-[#292126] md:text-[24px]">받은 협업 신청</h1>
            <p className="mt-1 text-[13px] text-[#574a4f]">총 {total}건</p>
          </div>
                  </div>

        {one(sp.deleted) && (
          <p role="status" className="mt-5 rounded-lg border border-sage bg-sage/20 px-3 py-2 text-[13px] text-title">
            삭제되었습니다.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={href(1, undefined)} className={chip(!status)}>전체</Link>
          {(Object.keys(STATUSES) as Status[]).map((s) => (
            <Link key={s} href={href(1, s)} className={chip(status === s)}>
              {STATUSES[s]}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="mt-6 rounded-xl border border-[#e8dfe3] bg-[#faf7f8] px-6 py-14 text-center">
            <p className="text-[14px] text-[#292126]">{status ? "이 상태의 신청이 없습니다." : "아직 받은 협업 신청이 없습니다."}</p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-[#e8dfe3] rounded-xl border border-[#e8dfe3]">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/collab/${r.id}`} className="flex flex-col gap-1.5 px-4 py-4 hover:bg-[#f5ecf0] sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[15px] font-medium text-[#292126]">{r.applicant_name}</p>
                    <p className="text-[12px] text-[#574a4f]">
                      {r.plan_id ? `기획안 「${r.plans?.title ?? "제목 없음"}」` : (r.source_works?.title ?? "전체 협업 제안")} · {r.roles.map((x) => ROLES[x]).join(", ")} · {formatKstDate(r.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-4 text-[13px]" aria-label="쪽 이동">
            {page > 1 ? <Link href={href(page - 1)} className="text-jaju">← 이전</Link> : <span className="opacity-40">← 이전</span>}
            <span>{page} / {pages}</span>
            {page < pages ? <Link href={href(page + 1)} className="text-jaju">다음 →</Link> : <span className="opacity-40">다음 →</span>}
          </nav>
        )}
      </PaperCard>
    </PaperPage>
  );
}
