import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreatorProfile } from "@/components/creators/creator-profile";
import { getCurrentUser } from "@/lib/auth";
import { toProfileData } from "@/lib/creator-cards";
import { load } from "./load";
import { createAuthClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic"; // 공개를 끄면 바로 404가 되도록 열 때마다 새로 읽는다

type Props = { params: Promise<{ handle: string }> };

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
      owner={data.owner ? { editHref: "/portfolio/new?step=profile", registerHref: "/portfolio/new?new=1" } : undefined}
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
