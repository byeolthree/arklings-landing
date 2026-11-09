import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CreatorProfile } from "@/components/creators/creator-profile";
import { WorkDetail } from "@/components/creators/work-detail";
import { getCurrentUser } from "@/lib/auth";
import { toProfileData, toWorkCard } from "@/lib/creator-cards";
import { getCreator, getWork, listCreatorWorks, UUID_QUERY, type WorkDetail as WorkDetailData } from "@/lib/creators";
import { loadMyCreator } from "@/lib/creators-mine";
import { createAuthClient } from "@/lib/supabase/server";
import type { CreatorProfile as CreatorProfileData } from "@/lib/creators";
import type { WorkListItem } from "@/lib/creators";

export const dynamic = "force-dynamic"; // 내리거나 지우면 바로 404가 되도록 열 때마다 새로 읽는다

type Props = { params: Promise<{ id: string }> };
type Loaded = { work: WorkDetailData; profile: CreatorProfileData; works: WorkListItem[]; preview: boolean };

// /portfolio/<작품 번호>는 작품 공유 주소다(D29). 공개된 작품이면 누구나, 아니면 주인만 본다. 프로필 화면 위에 작품 창이 열린다(D28).
const load = cache(async (id: string): Promise<Loaded | null> => {
  if (!UUID_QUERY.test(id)) return null;
  const work = await getWork(id);
  if (work) {
    const [profile, works] = await Promise.all([getCreator(work.authorHandle), listCreatorWorks(work.authorHandle)]);
    if (profile) return { work, profile, works, preview: false };
  }
  const user = await getCurrentUser();
  if (!user?.emailConfirmed) return null;
  const mine = await loadMyCreator(user.id);
  const w = mine.works.find((x) => x.id === id);
  if (!w || !mine.profile) return null;
  let name = mine.profile.handle;
  try {
    const sb = await createAuthClient();
    const { data } = await sb.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    name = (data as { display_name?: string } | null)?.display_name || name;
  } catch {
    // 이름을 못 읽어도 미리 보기는 연다
  }
  return {
    work: { ...w, authorHandle: mine.profile.handle, authorName: name },
    profile: { handle: mine.profile.handle, name, roles: mine.profile.roles, bio: mine.profile.bio, channels: mine.profile.channels, openToCollab: mine.profile.openToCollab },
    works: mine.works.filter((x) => x.isPublic),
    preview: true,
  };
});

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
        work={{ title: work.title, authorName: work.authorName, publishedAt: work.publishedAt, roles: work.roles, genres: work.genres, logline: work.logline, blocks: work.blocks }}
        closeHref={`/creators/${work.authorHandle}`}
        // 「이 작품에 협업 신청」은 협업 신청 쪽 코드가 작품을 받게 되는 0010 이후에 연다.
      />
    </>
  );
}
