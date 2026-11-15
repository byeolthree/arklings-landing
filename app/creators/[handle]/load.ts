// 크리에이터 프로필이 읽는 값. page.tsx와 layout.tsx가 같이 쓴다(한 요청 안에서 한 번만 읽도록 cache).
// layout.tsx가 이것을 먼저 확인해 없는 크리에이터면 응답을 보내기 전에 못 찾음(404)으로 보낸다(loading.tsx가 있으면 page 안의 notFound()는 이미 200으로 보낸 뒤라 코드가 바뀌지 않는다).
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { formatsOf, mediaOfBlocks, repBlockOf, repOf, toWorkCard } from "@/lib/creator-cards";
import { getCreator, listCreatorWorks, loadWorkMedia, loadWorkReps } from "@/lib/creators";
import { loadMyCreator } from "@/lib/creators-mine";

// 공개 프로필이면 누구나, 비공개 프로필이면 본인만(「비공개 상태입니다」 표시와 함께, D13). 제목과 본문이 한 요청 안에서 한 번만 읽도록 cache.
// 본인이 자기 프로필을 열면(공개든 비공개든) 비공개 작품까지 모두 보이고, 작품마다 공개 스위치와 순서 손잡이가 붙는다(시안 03).
export const load = cache(async (handle: string) => {
  const h = handle.toLowerCase();
  const user = await getCurrentUser();
  const mine = user?.emailConfirmed ? await loadMyCreator(user.id).catch(() => null) : null;
  const pub = await getCreator(h);
  if (mine?.profile && mine.profile.handle === h) {
    const profile = pub ?? { handle: mine.profile.handle, name: "", roles: mine.profile.roles, bio: mine.profile.bio, channels: mine.profile.channels, openToCollab: mine.profile.openToCollab, hero: mine.profile.hero?.kind, heroSrc: mine.profile.hero?.src ?? undefined };
    return { profile, works: mine.works.map((w) => toWorkCard(w, mediaOfBlocks(w.blocks), w.isPublic, repOf(w.blocks.map(repBlockOf), w.loglinePosition), formatsOf(w.blocks.map(repBlockOf), w.loglinePosition))), preview: !mine.profile.isPublic, owner: true };
  }
  if (!pub) return null;
  const list = await listCreatorWorks(h);
  const [media, reps] = await Promise.all([loadWorkMedia(list.map((w) => w.id)), loadWorkReps(list)]);
  return { profile: pub, works: list.map((w) => toWorkCard(w, media.get(w.id) ?? [], undefined, reps.get(w.id)?.rep, reps.get(w.id)?.formats)), preview: false, owner: false };
});

