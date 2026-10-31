import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanDetail } from "@/components/creators/plan-detail";
import { sampleDetailOf } from "@/components/creators/sample-data";

// 디자인 확인용 샘플 미리보기. 실제 DB와 연결되지 않고, 디자인이 끝나면 지운다.
export const metadata: Metadata = { title: "기획안 상세 샘플 미리보기", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PlanDetailPreviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  let plan = sampleDetailOf(id);
  if (!plan) notFound();

  const state = one(sp.state);
  // noprofile = 작성자가 프로필을 안 만든 경우, short = 질문별 답이 없는 경우
  if (state === "noprofile") plan = { ...plan, authorHandle: undefined, authorRoles: undefined };
  if (state === "short") plan = { ...plan, content: { ...plan.content, answers: [] } };

  const base = `/dev-preview/portfolio/${id}`;
  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 max-w-[260px] rounded-lg border border-[#e8dfe3] bg-white/95 px-3 py-2 text-[11px] leading-snug text-[#2a2025] shadow-md">
        <strong>미리보기 도우미</strong> (사이트에 없는 상자)
        <br />
        가짜 데이터예요. 보기:{" "}
        <Link href={base} className="underline">기본</Link> ·{" "}
        <Link href={`${base}?state=noprofile`} className="underline">프로필 없는 작성자</Link> ·{" "}
        <Link href={`${base}?state=short`} className="underline">답 없음</Link>
      </div>
      <PlanDetail
        plan={plan}
        listHref="/dev-preview/creators"
        profileHref={(h) => `/dev-preview/creators/${h}`}
        applyHref={`/collab/new?plan=${id}`}
      />
    </>
  );
}
