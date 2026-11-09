// 작품 공유 주소 /portfolio/<작품 번호>가 읽는 값. page.tsx와 layout.tsx가 같이 쓴다(한 요청 안에서 한 번만 읽도록 cache).
// layout.tsx가 이것을 먼저 확인해 없는 작품이면 응답을 보내기 전에 못 찾음(404)으로 보낸다(loading.tsx가 있으면 page 안의 notFound()는 이미 200으로 보낸 뒤라 코드가 바뀌지 않는다).
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getCreator, getWork, listCreatorWorks, UUID_QUERY, type WorkDetail as WorkDetailData } from "@/lib/creators";
import { loadMyCreator } from "@/lib/creators-mine";
import { createAuthClient } from "@/lib/supabase/server";
import type { CreatorProfile as CreatorProfileData } from "@/lib/creators";
import type { WorkListItem } from "@/lib/creators";

export type Loaded = { work: WorkDetailData; profile: CreatorProfileData; works: WorkListItem[]; preview: boolean };

// /portfolio/<작품 번호>는 작품 공유 주소다(D29). 공개된 작품이면 누구나, 아니면 주인만 본다. 프로필 화면 위에 작품 창이 열린다(D28).
export const load = cache(async (id: string): Promise<Loaded | null> => {
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

