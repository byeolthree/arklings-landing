import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CreatorProfile } from "@/components/creators/creator-profile";
import { getCurrentUser } from "@/lib/auth";
import { mediaOfBlocks, toProfileData, toWorkCard } from "@/lib/creator-cards";
import { getCreator, listCreatorWorks, loadWorkMedia } from "@/lib/creators";
import { loadMyCreator } from "@/lib/creators-mine";
import { createAuthClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic"; // 공개를 끄면 바로 404가 되도록 열 때마다 새로 읽는다

type Props = { params: Promise<{ handle: string }> };

// 공개 프로필이면 누구나, 비공개 프로필이면 본인만(「비공개 상태입니다」 표시와 함께, D13). 제목과 본문이 한 요청 안에서 한 번만 읽도록 cache.
// 본인이 자기 프로필을 열면(공개든 비공개든) 비공개 작품까지 모두 보이고, 작품마다 공개 스위치와 순서 손잡이가 붙는다(시안 03).
const load = cache(async (handle: string) => {
  const h = handle.toLowerCase();
  const user = await getCurrentUser();
  const mine = user?.emailConfirmed ? await loadMyCreator(user.id).catch(() => null) : null;
  const pub = await getCreator(h);
  if (mine?.profile && mine.profile.handle === h) {
    const profile = pub ?? { handle: mine.profile.handle, name: "", roles: mine.profile.roles, bio: mine.profile.bio, channels: mine.profile.channels, openToCollab: mine.profile.openToCollab };
    return { profile, works: mine.works.map((w) => toWorkCard(w, mediaOfBlocks(w.blocks), w.isPublic)), preview: !mine.profile.isPublic, owner: true };
  }
  if (!pub) return null;
  const list = await listCreatorWorks(h);
  const media = await loadWorkMedia(list.map((w) => w.id));
  return { profile: pub, works: list.map((w) => toWorkCard(w, media.get(w.id) ?? [])), preview: false, owner: false };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).handle);
  if (!data) return { title: "찾을 수 없는 크리에이터" };
  return { title: `${data.profile.name || data.profile.handle} · 크리에이터`, description: data.profile.bio.slice(0, 120) || undefined, robots: data.preview ? { index: false } : undefined };
}

export default async function CreatorProfilePage({ params }: Props) {
  const data = await load((await params).handle);
  if (!data) notFound();
  let name = data.profile.name;
  if (!name) name = (await displayNameOf()) || data.profile.handle;
  return (
    <CreatorProfile
      creator={toProfileData({ ...data.profile, name })}
      works={data.works}
      backHref="/creators"
      workHref={(id) => `/portfolio/${id}`}
      privateNote={data.preview}
      owner={data.owner ? { editHref: "/mypage#mp-creator", registerHref: "/mypage#mp-portfolio" } : undefined}
      // 본인 프로필·비공개 미리 보기에서는 협업 신청 버튼을 숨긴다(D13·D14).
      applyHref={data.owner || data.preview ? undefined : `/collab/new?creator=${data.profile.handle}`}
    />
  );
}

async function displayNameOf(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return "";
  const sb = await createAuthClient();
  const { data } = await sb.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  return (data as { display_name?: string } | null)?.display_name ?? "";
}
