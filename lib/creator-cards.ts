// 실제 읽기 결과(lib/creators.ts, lib/creators-mine.ts)를 화면 부품(components/creators)이 받는 모양으로 바꾼다. 주인 번호는 어디에도 싣지 않는다.
import { WORK_KINDS, type CreatorCard, type CreatorProfileData, type WorkCard, type WorkKind } from "@/components/creators/types";
import type { CreatorListItem, CreatorProfile, WorkListItem } from "@/lib/creators";

const asKind = (k: string | null): WorkKind | null => ((WORK_KINDS as readonly string[]).includes(k ?? "") ? (k as WorkKind) : null);

export function toWorkCard(w: Pick<WorkListItem, "id" | "title" | "logline" | "roles" | "genres" | "kind" | "form" | "publishedAt">): WorkCard {
  // 대표 이미지·영상 걸기는 아직 정해지지 않아 카드에 걸지 않는다(slides 빈 목록 = 안 보임).
  return { id: w.id, title: w.title, logline: w.logline, roles: w.roles, genres: w.genres, kind: asKind(w.kind), form: w.form, publishedAt: w.publishedAt, slides: [] };
}

export function toProfileData(p: CreatorProfile): CreatorProfileData {
  return { handle: p.handle, name: p.name, roles: p.roles, bio: p.bio || undefined, channels: p.channels, openToCollab: p.openToCollab, hero: p.hero, heroSrc: p.heroSrc };
}

export function toCreatorCard(c: CreatorListItem): CreatorCard {
  return {
    handle: c.handle,
    name: c.name,
    roles: c.roles,
    bio: c.bio || undefined,
    planCount: c.planCount,
    openToCollab: c.openToCollab,
    genres: c.genres,
    forms: c.forms,
    latest: c.latest ?? { title: "", logline: "" },
    hero: c.hero,
    heroSrc: c.heroSrc,
    main: "logline", // 대표 이미지·영상을 카드 메인으로 걸지는 아직 정해지지 않았다
  };
}
