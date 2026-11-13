// 실제 읽기 결과(lib/creators.ts, lib/creators-mine.ts)를 화면 부품(components/creators)이 받는 모양으로 바꾼다. 주인 번호는 어디에도 싣지 않는다.
import { WORK_KINDS, type CreatorCard, type CreatorProfileData, type WorkCard, type WorkKind } from "@/components/creators/types";
import type { CreatorListItem, CreatorProfile, WorkListItem, WorkMediaItem } from "@/lib/creators";
import { LOGLINE_TOKEN } from "@/lib/creator-rules";
import type { MyBlock, MyWork } from "@/lib/creators-mine";

const asKind = (k: string | null): WorkKind | null => ((WORK_KINDS as readonly string[]).includes(k ?? "") ? (k as WorkKind) : null);

export function toWorkCard(w: Pick<WorkListItem, "id" | "title" | "logline" | "roles" | "genres" | "kind" | "form" | "publishedAt">, media: WorkMediaItem[] = [], isPublic?: boolean, rep?: Rep): WorkCard {
  // 카드 왼쪽은 작품의 대표(repOf)를 따른다. 대표가 이미지·영상일 때만 이미지·영상을 건다.
  return { id: w.id, title: w.title, logline: w.logline, roles: w.roles, genres: w.genres, kind: asKind(w.kind), form: w.form, publishedAt: w.publishedAt, slides: [], media, isPublic, rep };
}

// 내 작품의 이미지·영상 요소를 카드에 걸 모양으로(위에서부터 순서대로).
export function mediaOfBlocks(blocks: MyBlock[]): WorkMediaItem[] {
  const out: WorkMediaItem[] = [];
  for (const b of blocks) {
    if (b.kind === "video") {
      if (b.youtubeId) out.push({ kind: "video", youtubeId: b.youtubeId });
      else if (b.src) out.push({ kind: "file-video", src: b.src });
    }
    else if (b.kind === "image" && b.src) out.push({ kind: "image", src: b.src });
  }
  return out;
}

// 작품 안의 로그라인 블록과 요소를 화면에 보이는 순서로 합친다(D35-2). 로그라인은 요소 앞에 loglinePosition개가 있는 자리에 놓이고, 요소 수보다 크면 맨 아래다.
export function orderItems<B>(blocks: B[], loglinePosition: number): (B | typeof LOGLINE_TOKEN)[] {
  const at = Math.min(Math.max(0, Math.floor(loglinePosition) || 0), blocks.length);
  return [...blocks.slice(0, at), LOGLINE_TOKEN, ...blocks.slice(at)];
}

// 작품의 대표(작품 안 맨 위에 놓인 것, D35-2)를 정하는 단 하나의 규칙. 탐색 카드·크리에이터 상세·마이 페이지 목록이 모두 이것을 쓴다(2026-11-13).
// 로그라인이 맨 위면 로그라인, 글·문서면 그 종류(없으면 「문서」)와 글 앞부분(글이 없으면 파일 이름), 이미지·영상이면 그 종류.
export type Rep = { kind: "logline" } | { kind: "doc"; label: string; text: string } | { kind: "image" | "video"; sub?: string };
export type RepBlock = { kind: string; sub?: string | null; body?: string | null; fileName?: string | null };
export function repOf(blocks: RepBlock[], loglinePosition: number): Rep {
  const top = orderItems(blocks, loglinePosition)[0];
  if (top === LOGLINE_TOKEN) return { kind: "logline" };
  if (top.kind === "image" || top.kind === "video") return { kind: top.kind, sub: top.sub ?? undefined };
  return { kind: "doc", label: top.sub || "문서", text: (top.body ?? "").trim() || (top.fileName ?? "") };
}

// 작품의 「대표」(마이페이지 접은 목록의 「대표」 칸, 시안 02): 작품 안에서 맨 위에 놓인 것이 대표다.
// 로그라인이면 「로그라인」, 영상이면 고른 세부 종류로 「티저 영상」처럼(안 골랐으면 「영상」), 이미지면 「컨셉 이미지」, 글·문서면 고른 종류(안 골랐으면 「문서」)다.
export function representativeOf(w: Pick<MyWork, "blocks" | "loglinePosition">): string {
  const r = repOf(w.blocks.map(repBlockOf), w.loglinePosition);
  if (r.kind === "logline") return "로그라인";
  if (r.kind === "doc") return r.label;
  if (r.kind === "image") return r.sub ? `${r.sub} 이미지` : "이미지";
  return !r.sub ? "영상" : r.sub.endsWith("영상") ? r.sub : `${r.sub} 영상`;
}
export const repBlockOf = (b: MyBlock): RepBlock => ({ kind: b.kind, sub: b.sub, body: b.kind === "text" ? b.body : null, fileName: "fileName" in b ? (b.fileName ?? null) : null });

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
    hero: media ? (c.coverKind ?? "image") : c.hero,
    heroSrc: media ? c.cover : c.heroSrc,
    main: media ? "media" : "logline",
    mainSub: media ? c.coverSub : undefined,
    mainFit: media ? c.coverFit : undefined,
    workId: c.workId,
    mainKind: media ? c.coverBlockKind : undefined,
    docLabel: media ? undefined : c.docLabel,
    docText: media ? undefined : c.docText,
  };
}
