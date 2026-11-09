// 실제 읽기 결과(lib/creators.ts, lib/creators-mine.ts)를 화면 부품(components/creators)이 받는 모양으로 바꾼다. 주인 번호는 어디에도 싣지 않는다.
import { WORK_KINDS, type CreatorCard, type CreatorProfileData, type WorkCard, type WorkKind } from "@/components/creators/types";
import type { CreatorListItem, CreatorProfile, WorkListItem, WorkMediaItem } from "@/lib/creators";
import type { MyBlock, MyWork } from "@/lib/creators-mine";

const asKind = (k: string | null): WorkKind | null => ((WORK_KINDS as readonly string[]).includes(k ?? "") ? (k as WorkKind) : null);

export function toWorkCard(w: Pick<WorkListItem, "id" | "title" | "logline" | "roles" | "genres" | "kind" | "form" | "publishedAt">, media: WorkMediaItem[] = [], isPublic?: boolean): WorkCard {
  // 작품 안 이미지·영상이 있으면 그것을 카드에 건다(없으면 안 보임).
  return { id: w.id, title: w.title, logline: w.logline, roles: w.roles, genres: w.genres, kind: asKind(w.kind), form: w.form, publishedAt: w.publishedAt, slides: [], media, isPublic };
}

// 내 작품의 이미지·영상 요소를 카드에 걸 모양으로(위에서부터 순서대로).
export function mediaOfBlocks(blocks: MyBlock[]): WorkMediaItem[] {
  const out: WorkMediaItem[] = [];
  for (const b of blocks) {
    if (b.kind === "video") out.push({ kind: "video", youtubeId: b.youtubeId });
    else if (b.kind === "image" && b.src) out.push({ kind: "image", src: b.src });
  }
  return out;
}

// 작품의 「대표」: 작품 안에서 맨 위에 있는 이미지·영상이 그 작품의 대표이고, 없으면 로그라인이다(마이페이지 접은 목록의 「대표」 칸).
export function representativeOf(w: Pick<MyWork, "blocks">): "영상" | "이미지" | "로그라인" {
  const first = w.blocks.find((b) => b.kind === "image" || b.kind === "video");
  return first ? (first.kind === "video" ? "영상" : "이미지") : "로그라인";
}

export function toProfileData(p: CreatorProfile): CreatorProfileData {
  return { handle: p.handle, name: p.name, roles: p.roles, bio: p.bio || undefined, channels: p.channels, openToCollab: p.openToCollab, hero: p.hero, heroSrc: p.heroSrc };
}

export function toCreatorCard(c: CreatorListItem): CreatorCard {
  // 영상 제작·아트디렉터이고 가장 최근 작품의 대표(맨 위 이미지·영상)가 있으면 카드 메인에 건다. 아니면 로그라인.
  const media = Boolean(c.cover);
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
    hero: media ? "image" : c.hero,
    heroSrc: media ? c.cover : c.heroSrc,
    main: media ? "media" : "logline",
  };
}
