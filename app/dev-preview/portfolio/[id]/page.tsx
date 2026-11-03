import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreatorProfile } from "@/components/creators/creator-profile";
import { SAMPLE_CREATORS, SAMPLE_PROFILE_PAGE_SIZE, sampleDetailOf, sampleProfileOf, samplePlansOf } from "@/components/creators/sample-data";
import { WorkDetail } from "@/components/creators/work-detail";

// 디자인 확인용 샘플 미리보기. 실제 DB와 연결되지 않고, 디자인이 끝나면 지운다.
// 작품 상세 창(D28): 작성자의 프로필 위에서 열린다. 프로필 화면은 아직 예전 구조라 다음 화면에서 고친다.
export const metadata: Metadata = { title: "작품 상세 샘플 미리보기", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function WorkDetailPreviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const plan = sampleDetailOf(id);
  if (!plan) notFound();

  const state = one(sp.state); // noprofile = 작성자가 프로필을 안 만든 경우, noplan = 기획안을 붙이지 않은 작품
  const card = SAMPLE_CREATORS.find((c) => c.handle === plan.authorHandle);
  const hasProfile = !!card && state !== "noprofile";
  const closeHref = hasProfile ? `/dev-preview/creators/${card.handle}` : "/dev-preview/creators";
  const base = `/dev-preview/portfolio/${id}`;

  const work = {
    title: plan.title,
    authorName: plan.authorName,
    publishedAt: plan.publishedAt,
    roles: plan.authorRoles ?? [],
    genres: card?.latest.genres ?? [],
    logline: plan.content.sections[0]?.text ?? "",
    plan: state === "noplan" ? undefined : plan.content.answers,
  };

  const plans = hasProfile ? samplePlansOf(card).slice(0, SAMPLE_PROFILE_PAGE_SIZE) : [];
  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 max-w-[260px] rounded-lg border border-[#e8dfe3] bg-white/95 px-3 py-2 text-[11px] leading-snug text-[#2a2025] shadow-md">
        <strong>미리보기 도우미</strong> (사이트에 없는 상자)
        <br />
        가짜 데이터예요. 보기:{" "}
        <Link href={base} className="underline">기본</Link> ·{" "}
        <Link href={`${base}?state=noplan`} className="underline">기획안 없는 작품</Link> ·{" "}
        <Link href={`${base}?state=noprofile`} className="underline">프로필 없는 작성자</Link>
      </div>
      {hasProfile && (
        <CreatorProfile
          creator={sampleProfileOf(card)}
          plans={plans}
          total={card.planCount}
          page={1}
          pages={1}
          backHref="/dev-preview/creators"
          planHref={(pid) => `/dev-preview/portfolio/${pid}`}
          pageHref={() => closeHref}
        />
      )}
      <WorkDetail work={work} closeHref={closeHref} applyHref="/collab/new" />
    </>
  );
}
