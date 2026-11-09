import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreatorProfile } from "@/components/creators/creator-profile";
import { WorkDetail } from "@/components/creators/work-detail";
import { toProfileData, toWorkCard } from "@/lib/creator-cards";
import { load } from "./load";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic"; // 내리거나 지우면 바로 404가 되도록 열 때마다 새로 읽는다

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).id);
  if (!data) return { title: "찾을 수 없는 작품" };
  return { title: `${data.work.title} · 포트폴리오`, description: data.work.logline.slice(0, 120) || undefined, robots: data.preview ? { index: false } : undefined };
}

export default async function WorkPage({ params }: Props) {
  const data = await load((await params).id);
  if (!data) notFound();
  const { work, profile, works, preview } = data;
  return (
    <>
      <CreatorProfile creator={toProfileData(profile)} works={works.map((w) => toWorkCard(w))} backHref="/creators" workHref={(id) => `/portfolio/${id}`} privateNote={preview && !works.some((w) => w.id === work.id)} />
      <WorkDetail
        work={{ title: work.title, authorName: work.authorName, publishedAt: work.publishedAt, roles: work.roles, genres: work.genres, logline: work.logline, blocks: work.blocks, loglinePosition: work.loglinePosition }}
        closeHref={`/creators/${work.authorHandle}`}
        // 본인이 비공개 미리 보기로 열었을 때는 협업 신청 버튼을 숨긴다(D13·D14).
        applyHref={preview || !profile.openToCollab ? undefined : `/collab/new?work=${work.id}`}
      />
    </>
  );
}
