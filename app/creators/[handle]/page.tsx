import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CreatorProfile } from "@/components/creators/creator-profile";
import { getCurrentUser } from "@/lib/auth";
import { toProfileData, toWorkCard } from "@/lib/creator-cards";
import { getCreator, listCreatorWorks } from "@/lib/creators";
import { loadMyCreator } from "@/lib/creators-mine";
import { createAuthClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic"; // 공개를 끄면 바로 404가 되도록 열 때마다 새로 읽는다

type Props = { params: Promise<{ handle: string }> };

// 공개 프로필이면 누구나, 비공개 프로필이면 본인만(「비공개 상태입니다」 표시와 함께, D13). 제목과 본문이 한 요청 안에서 한 번만 읽도록 cache.
const load = cache(async (handle: string) => {
  const h = handle.toLowerCase();
  const pub = await getCreator(h);
  if (pub) return { profile: pub, works: await listCreatorWorks(h), preview: false };
  const user = await getCurrentUser();
  if (!user?.emailConfirmed) return null;
  const mine = await loadMyCreator(user.id);
  if (!mine.profile || mine.profile.handle !== h || mine.profile.isPublic) return null;
  return {
    profile: { handle: mine.profile.handle, name: "", roles: mine.profile.roles, bio: mine.profile.bio, channels: mine.profile.channels, openToCollab: mine.profile.openToCollab },
    works: mine.works.filter((w) => w.isPublic),
    preview: true,
  };
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
  if (data.preview) name = (await displayNameOf()) || data.profile.handle;
  return (
    <CreatorProfile
      creator={toProfileData({ ...data.profile, name })}
      works={data.works.map(toWorkCard)}
      backHref="/creators"
      workHref={(id) => `/portfolio/${id}`}
      privateNote={data.preview}
      // 「이 크리에이터에게 협업 신청」은 협업 신청 쪽 코드가 크리에이터를 받게 되는 0010 이후에 연다.
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
