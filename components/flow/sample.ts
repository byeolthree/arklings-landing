// 협업 신청 흐름 샘플(/dev-preview/flow)용 가짜 데이터. 실제 DB와 연결되지 않고, 디자인이 끝나면 지운다.
import { loglineOf, SAMPLE_CREATORS, samplePlansOf } from "@/components/creators/sample-data";
import type { Role } from "@/lib/collab";

// 포트폴리오 항목의 종류(별뜨리님 지시 2026-11-04). 앞 다섯은 기획안, 뒤 셋은 작업물.
export const KINDS = {
  logline: "로그라인",
  outline: "아웃라인",
  bible: "시리즈 바이블",
  pilot: "파일럿",
  pitchdoc: "피치 문서",
  pitchvideo: "피치 영상",
  image: "스토리 없는 이미지",
  video: "스토리 없는 영상",
} as const;
export type Kind = keyof typeof KINDS;
const PLAN_KINDS: Kind[] = ["logline", "outline", "bible", "pilot", "pitchdoc"];
export const isPlanKind = (k: Kind) => PLAN_KINDS.includes(k);

export type Format = "long" | "short";
export const FORMATS: Record<Format, string> = { long: "롱폼", short: "숏폼" };

export type FlowItem = { id: string; title: string; kind: Kind; genres: string[]; format: Format; text: string };
export type FlowCreator = {
  handle: string;
  name: string; // 닉네임
  roles: Role[];
  genres: string[];
  formats: Format[];
  about: string;
  channels: { label: string; url: string }[];
  open: boolean; // 협업 받는 중
  items: FlowItem[];
};

const KIND_BY_ROLE: Record<Role, Kind[]> = {
  script: ["logline", "outline", "bible", "pilot"],
  video: ["pitchvideo", "video"],
  art_director: ["image"],
  history_advisor: ["outline", "pitchdoc"],
  producer: ["pitchdoc", "pitchvideo"],
  other: ["image", "video"],
};
const SHORT_KINDS: Kind[] = ["logline", "pitchvideo", "image", "video"];
const OPEN_OFF = new Set(["dayun-choi", "taeyang-baek"]);
const CHANNELS: Record<string, { label: string; url: string }[]> = {
  "jian-lee": [{ label: "인스타그램", url: "https://example.com/instagram" }, { label: "유튜브", url: "https://example.com/youtube" }],
  "seoha-park": [{ label: "유튜브", url: "https://example.com/youtube" }],
  "hayun-jung": [{ label: "블로그", url: "https://example.com/blog" }],
};

export const FLOW_CREATORS: FlowCreator[] = SAMPLE_CREATORS.map((c) => {
  const kinds = Array.from(new Set(c.roles.flatMap((r) => KIND_BY_ROLE[r])));
  const plans = samplePlansOf({ ...c, planCount: Math.min(8, Math.max(4, c.planCount + 2)) });
  const genres = c.latest.genres ?? ["드라마"];
  const items: FlowItem[] = plans.map((p, i) => {
    const kind = kinds[i % kinds.length];
    return { id: `${c.handle}-${i + 1}`, title: p.title, kind, genres: i % 2 === 0 ? genres : genres.slice(0, 1), format: SHORT_KINDS.includes(kind) ? "short" : "long", text: loglineOf(p.title) };
  });
  return {
    handle: c.handle,
    name: c.name,
    roles: c.roles,
    genres,
    formats: Array.from(new Set(items.map((x) => x.format))),
    about: c.bio ?? "",
    channels: CHANNELS[c.handle] ?? [],
    open: !OPEN_OFF.has(c.handle),
    items,
  };
});

export const creatorOf = (handle?: string) => FLOW_CREATORS.find((c) => c.handle === handle);
export const itemOf = (c: FlowCreator, id?: string) => c.items.find((x) => x.id === id);

// 「로그라인 3 · 시리즈 바이블 1」처럼 종류별 개수(KINDS 순서)
export function kindCounts(c: FlowCreator): { kind: Kind; n: number }[] {
  return (Object.keys(KINDS) as Kind[]).map((kind) => ({ kind, n: c.items.filter((x) => x.kind === kind).length })).filter((x) => x.n > 0);
}

// 협업 신청서 주소. 위 세 곳(목록·프로필·기획안 창)과 킹덤 화면 어디서 들어와도 받는 크리에이터·보고 온 기획안·역할이 채워진다.
export function applyHref(creator: string, opts: { plan?: string; role?: Role } = {}) {
  const p = new URLSearchParams({ creator });
  if (opts.plan) p.set("plan", opts.plan);
  if (opts.role) p.set("role", opts.role);
  return `/dev-preview/flow/apply?${p.toString()}`;
}
