// 크리에이터·작품 읽기(누구나 보는 화면). 목록·프로필·작품 상세 화면은 이 파일의 함수만 부른다.
// DB의 공개용 보기(view) 4개(creators_public, creator_channels_public, creator_works_public, creator_blocks_public)에서만 읽고,
// 로그인 없는 연결(lib/supabase.ts)을 쓴다. 보기에는 공개 프로필의 공개 작품만 있고 주인 번호(UUID)·이메일은 한 칸도 없다.
// 화면으로 넘기는 값에도 싣지 않는다. 파일은 비공개 보관함에 있어서, 공개용 보기에 올라와 있는 것만 짧은 임시 주소로 바꿔 준다(lib/creator-files.ts).
import { formatsOf, orderItems, repOf, type Format, type Rep } from "@/lib/creator-cards";
import type { Role } from "@/lib/collab";
import { isRole, LOGLINE_TOKEN } from "@/lib/creator-rules";
import { signPublicFiles } from "@/lib/creator-files";
import { getSupabase } from "@/lib/supabase";

export const CREATOR_PAGE_SIZE = 12;

export type HeroKind = "image" | "video";
export type WorkForm = "long" | "short";

export type CreatorFilterInput = { q?: string; role?: Role; genre?: string; form?: WorkForm; open?: boolean; fmt?: string };

export type CreatorListItem = {
  handle: string;
  name: string; // 닉네임
  roles: Role[];
  bio: string; // 소개 글(앞부분만 보이게 하는 것은 화면 몫)
  planCount: number; // 공개한 작품 수(0일 수 있다)
  openToCollab: boolean;
  genres: string[];
  forms: WorkForm[];
  latest: { title: string; logline: string; genres: string[] } | null; // 가장 최근에 올린 작품(작품이 없으면 null)
  hero?: HeroKind;
  heroSrc?: string; // 대표 이미지·영상의 임시 주소
  coverKind?: "image" | "video"; // cover가 그림 주소인지 영상 파일 주소인지(올린 MP4는 영상 그대로 건다)
  workId?: string; // 탐색 카드 한 장 = 공개 작품 하나(2026-11-13). 그 작품 번호
  coverFit?: "cover" | "contain"; // 대표 이미지를 카드에 꽉 채울지, 여백을 둘지(0027)
  coverSub?: string; // 카드 대표 콘텐츠의 종류 태그(포스터·티저 등). 없으면 비어 있다
  docLabel?: string; // 대표가 글·문서일 때 카드의 종류 글자
  docText?: string; // 대표가 글·문서일 때 카드에 보일 글 앞부분(글이 없으면 파일 이름)
  coverBlockKind?: "image" | "video"; // 대표 콘텐츠 요소가 원래 이미지인지 영상인지(유튜브 영상도 video)
  cover?: string; // 이 작품의 대표(작품 안 맨 위, D35-2)가 이미지·영상일 때 그 주소
};

export type CreatorProfile = {
  handle: string;
  name: string;
  roles: Role[];
  bio: string;
  channels: { label: string; url: string }[];
  openToCollab: boolean;
  hero?: HeroKind;
  heroSrc?: string;
};

export type WorkListItem = {
  id: string;
  title: string;
  logline: string;
  roles: Role[];
  genres: string[];
  kind: string | null;
  form: WorkForm | null;
  publishedAt: string; // 처음 올린 시각(ISO)
  loglinePosition?: number; // 로그라인 앞에 있는 요소 개수(대표를 정할 때 쓴다)
};

export type WorkBlock =
  | { id: string; kind: "text"; body: string; sub?: string }
  | { id: string; kind: "image"; fileName: string | null; fileBytes?: number | null; src: string | null; sub?: string; fit?: "cover" | "contain" }
  | { id: string; kind: "video"; youtubeId: string | null; fileName?: string | null; fileBytes?: number | null; src?: string | null; sub?: string } // 유튜브 주소 또는 MP4 파일(2026-11-09 D18 개정)
  | { id: string; kind: "document"; fileName: string | null; fileBytes: number | null; src: string | null; sub?: string };

export type WorkDetail = WorkListItem & {
  authorHandle: string;
  authorName: string;
  blocks: WorkBlock[]; // 만든 사람이 정한 순서
  loglinePosition: number; // 로그라인 앞에 있는 요소의 개수(0이면 맨 위, D35-2). 요소 수보다 크면 맨 아래로 본다
};

type CreatorRow = {
  public_handle: string;
  display_name: string;
  roles: string[];
  bio: string;
  open_to_collab: boolean;
  hero_kind: HeroKind | null;
  hero_path: string | null;
  work_count: number;
  genres: string[] | null;
  forms: string[] | null;
  latest_title: string | null;
  latest_logline: string | null;
  latest_genres: string[] | null;
};
const CREATOR_COLUMNS =
  "public_handle, display_name, roles, bio, open_to_collab, hero_kind, hero_path, work_count, genres, forms, latest_title, latest_logline, latest_genres";

type WorkRow = {
  id: string;
  author_handle: string;
  author_name: string;
  title: string;
  roles: string[];
  genres: string[] | null;
  kind: string | null;
  form: string | null;
  logline: string;
  published_at: string;
  logline_position?: number | null;
};
const WORK_COLUMNS = "id, author_handle, author_name, title, roles, genres, kind, form, logline, published_at, logline_position";

type BlockRow = {
  id: string;
  position: number;
  kind: "text" | "image" | "video" | "document";
  body: string | null;
  file_path: string | null;
  file_name: string | null;
  file_bytes: number | null;
  youtube_id: string | null;
  sub_kind?: string | null; // 0012 이후
};

const asRoles = (v: string[] | null | undefined): Role[] => (v ?? []).filter(isRole);
const asForms = (v: string[] | null | undefined): WorkForm[] => (v ?? []).filter((f): f is WorkForm => f === "long" || f === "short");
const asForm = (v: string | null): WorkForm | null => (v === "long" || v === "short" ? v : null);
const HANDLE_QUERY = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
export const UUID_QUERY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 보기(view)의 검색 조건에 넣기 전에 검색어의 특수 문자를 뺀다(PostgREST 조건 문법과 LIKE 기호).
const cleanQuery = (q: string) => q.replace(/[%_,()*\\"'.:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 30);

function toListItem(r: CreatorRow, heroUrls: Map<string, string>): CreatorListItem {
  return {
    handle: r.public_handle,
    name: r.display_name,
    roles: asRoles(r.roles),
    bio: r.bio ?? "",
    planCount: r.work_count ?? 0,
    openToCollab: r.open_to_collab,
    genres: r.genres ?? [],
    forms: asForms(r.forms),
    latest: r.latest_title ? { title: r.latest_title, logline: r.latest_logline ?? "", genres: r.latest_genres ?? [] } : null,
    hero: r.hero_kind ?? undefined,
    heroSrc: r.hero_path ? heroUrls.get(r.hero_path) : undefined,
  };
}

// 탐색 화면: 공개 프로필의 공개 작품을 한 장씩 카드로(2026-11-13 아키텍터 지시).
// 순서(2026-11-14 아키텍터 지시): 게시판처럼 새로 올린 작품이 맨 위. 각 작품이 차지하는 자리는 올린 시각 순서로 정해지고,
// 크리에이터는 그 자리들 안에서만 자기 작품끼리 순서를 바꿀 수 있다(포트폴리오 목록의 손잡이 순서로 자기 자리를 채운다).
// 카드 왼쪽은 작품의 대표(맨 위 요소, repOf)를 역할과 상관없이 그대로 보여 준다.
// 거르기(역할·협업은 사람 기준, 장르·롱폼/숏폼·포맷·검색어는 작품 기준)를 모두 끝낸 뒤 쪽을 나눈다. total은 걸러진 카드 수다.
const EXPLORE_CREATOR_LIMIT = 300;

export async function listCreators(filter: CreatorFilterInput, page: number): Promise<{ items: CreatorListItem[]; total: number }> {
  let query = getSupabase().from("creators_public").select(CREATOR_COLUMNS).gte("work_count", 1);
  if (filter.role) query = query.contains("roles", [filter.role]);
  if (filter.open) query = query.eq("open_to_collab", true);
  const { data, error } = await query.order("created_at", { ascending: false }).order("public_handle", { ascending: true }).limit(EXPLORE_CREATOR_LIMIT);
  if (error) throw new Error(error.message);
  const creators = (data ?? []) as unknown as CreatorRow[];

  const worksBy = await loadAllWorks(creators.map((r) => r.public_handle));
  const q = cleanQuery(filter.q ?? "").toLowerCase();
  const pairs = creators.flatMap((c) =>
    (worksBy.get(c.public_handle) ?? [])
      .filter((w) => !filter.genre || w.genres.includes(filter.genre))
      .filter((w) => !filter.form || w.form === filter.form)
      .filter((w) => !q || [c.display_name, c.bio ?? "", w.title, w.logline].some((t) => t.toLowerCase().includes(q)))
      .map((w) => ({ c, w })),
  );
  // 자리: 올린 시각이 최근인 것부터. 각 자리에는 그 자리 주인의 작품을 그 사람이 정한 순서대로 채운다.
  const slots = [...pairs].sort((a, b) => b.w.publishedAt.localeCompare(a.w.publishedAt));
  const queue = new Map<string, typeof pairs>();
  for (const p of pairs) queue.set(p.c.public_handle, [...(queue.get(p.c.public_handle) ?? []), p]);
  const ordered = slots.map((slot) => (queue.get(slot.c.public_handle) ?? []).shift() ?? slot);
  const reps = await loadExploreReps(pairs.map((p) => p.w));
  const kept = filter.fmt ? ordered.filter((p) => repLabel(reps.get(p.w.id)) === filter.fmt) : ordered;

  const from = (Math.max(1, page) - 1) * CREATOR_PAGE_SIZE;
  const shown = kept.slice(from, from + CREATOR_PAGE_SIZE);
  const urls = await signPublicFiles([...shown.map((p) => p.c.hero_path), ...shown.map((p) => reps.get(p.w.id)?.filePath ?? null)]);
  const items = shown.map(({ c, w }): CreatorListItem => {
    const r = reps.get(w.id);
    const media = r && (r.rep.kind === "image" || r.rep.kind === "video") ? mediaSrc(r, urls) : null;
    return {
      ...toListItem(c, urls),
      workId: w.id,
      latest: { title: w.title, logline: w.logline, genres: w.genres },
      cover: media?.src,
      coverKind: media?.kind,
      coverBlockKind: media ? (r?.rep.kind as "image" | "video") : undefined,
      coverSub: media && r && r.rep.kind !== "logline" && r.rep.kind !== "doc" ? r.rep.sub : undefined,
      coverFit: media ? r?.fit : undefined,
      docLabel: r?.rep.kind === "doc" ? r.rep.label : undefined,
      docText: r?.rep.kind === "doc" ? r.rep.text : undefined,
    };
  });
  return { items, total: kept.length };
}

// 카드에 보이는 종류 글자(포맷 필터가 비교하는 값): 로그라인 · 문서 종류 · 이미지·영상 종류.
export function repLabel(r: ExploreRep | undefined): string {
  if (!r || r.rep.kind === "logline") return "로그라인";
  if (r.rep.kind === "doc") return r.rep.label;
  return r.rep.sub ?? (r.rep.kind === "video" ? "영상" : "이미지");
}

type ExploreWork = { id: string; title: string; logline: string; genres: string[]; form: WorkForm | null; loglinePosition: number; publishedAt: string };
type ExploreRep = { rep: Rep; filePath: string | null; youtubeId: string | null; fit: "cover" | "contain" };

// 크리에이터마다 공개 작품 전부(등록 목록 순서: 순서 번호가 작은 것부터, 같으면 최근 공개).
async function loadAllWorks(handles: string[]): Promise<Map<string, ExploreWork[]>> {
  const out = new Map<string, ExploreWork[]>();
  if (handles.length === 0) return out;
  const { data, error } = await getSupabase()
    .from("creator_works_public")
    .select("id, author_handle, title, logline, genres, form, logline_position, published_at")
    .in("author_handle", handles)
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  type W = { id: string; author_handle: string; title: string; logline: string | null; genres: string[] | null; form: string | null; logline_position: number | null; published_at: string };
  for (const w of (data ?? []) as W[]) {
    const list = out.get(w.author_handle) ?? [];
    list.push({ id: w.id, title: w.title, logline: w.logline ?? "", genres: w.genres ?? [], form: asForm(w.form), loglinePosition: w.logline_position ?? 0, publishedAt: w.published_at ?? "" });
    out.set(w.author_handle, list);
  }
  return out;
}

// 작품마다 대표(repOf)와, 대표가 이미지·영상이면 그 파일 정보.
async function loadExploreReps(works: ExploreWork[]): Promise<Map<string, ExploreRep>> {
  const out = new Map<string, ExploreRep>();
  if (works.length === 0) return out;
  const { data, error } = await getSupabase()
    .from("creator_blocks_public")
    .select("work_id, kind, body, file_path, file_name, youtube_id, sub_kind, fit")
    .in("work_id", works.map((w) => w.id))
    .order("position", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  type B = { work_id: string; kind: string; body: string | null; file_path: string | null; file_name: string | null; youtube_id: string | null; sub_kind: string | null; fit: string | null };
  const byWork = new Map<string, B[]>();
  for (const b of (data ?? []) as B[]) byWork.set(b.work_id, [...(byWork.get(b.work_id) ?? []), b]);
  for (const w of works) {
    const blocks = byWork.get(w.id) ?? [];
    const rb = blocks.map((b) => ({ kind: b.kind, sub: b.sub_kind, body: b.body, fileName: b.file_name }));
    const rep = repOf(rb, w.loglinePosition);
    const top = orderItems(blocks, w.loglinePosition)[0];
    const b = top === LOGLINE_TOKEN ? null : top;
    out.set(w.id, { rep, filePath: b?.file_path ?? null, youtubeId: b?.youtube_id ?? null, fit: b?.fit === "cover" ? "cover" : "contain" });
  }
  return out;
}

// 대표 이미지·영상의 카드용 주소. 유튜브는 유튜브가 주는 대표 그림, 올린 MP4는 영상 그대로, 이미지는 그 이미지.
function mediaSrc(r: ExploreRep, urls: Map<string, string>): { src: string; kind: "image" | "video" } | null {
  if (r.youtubeId) return { src: `https://i.ytimg.com/vi/${r.youtubeId}/hqdefault.jpg`, kind: "image" };
  const src = r.filePath ? urls.get(r.filePath) : undefined;
  if (!src) return null;
  return { src, kind: r.rep.kind === "video" ? "video" : "image" };
}

// 공개 프로필 하나. 없거나 비공개면 null(화면은 404로 보여 준다. 본인 미리 보기는 화면이 따로 처리한다).
export async function getCreator(handle: string): Promise<CreatorProfile | null> {
  const h = String(handle ?? "").toLowerCase();
  if (!HANDLE_QUERY.test(h) || h.length > 20) return null;
  const sb = getSupabase();
  const { data, error } = await sb.from("creators_public").select(CREATOR_COLUMNS).eq("public_handle", h).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as CreatorRow;

  const [channels, heroUrls] = await Promise.all([
    sb.from("creator_channels_public").select("label, url, position").eq("public_handle", h).order("position", { ascending: true }),
    signPublicFiles([row.hero_path]),
  ]);
  if (channels.error) throw new Error(channels.error.message);

  return {
    handle: row.public_handle,
    name: row.display_name,
    roles: asRoles(row.roles),
    bio: row.bio ?? "",
    channels: ((channels.data ?? []) as { label: string; url: string }[]).map((c) => ({ label: c.label, url: c.url })),
    openToCollab: row.open_to_collab,
    hero: row.hero_kind ?? undefined,
    heroSrc: row.hero_path ? heroUrls.get(row.hero_path) : undefined,
  };
}

const toWorkItem = (r: WorkRow): WorkListItem => ({
  id: r.id,
  title: r.title,
  logline: r.logline ?? "",
  roles: asRoles(r.roles),
  genres: r.genres ?? [],
  kind: r.kind,
  form: asForm(r.form),
  publishedAt: r.published_at,
  loglinePosition: Math.max(0, r.logline_position ?? 0),
});

// 그 크리에이터가 올린 작품(최대 12개라 쪽 나눔 없음). 처음 올린 순서의 최근 것 먼저.
export async function listCreatorWorks(handle: string): Promise<WorkListItem[]> {
  const h = String(handle ?? "").toLowerCase();
  if (!HANDLE_QUERY.test(h) || h.length > 20) return [];
  const { data, error } = await getSupabase()
    .from("creator_works_public")
    .select(WORK_COLUMNS)
    .eq("author_handle", h)
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(12);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as WorkRow[]).map(toWorkItem);
}

// 공개된 작품 하나와 그 안의 요소(만든 사람이 정한 순서). 없거나 공개가 아니면 null.
export async function getWork(id: string): Promise<WorkDetail | null> {
  if (!UUID_QUERY.test(String(id ?? ""))) return null;
  const sb = getSupabase();
  const { data, error } = await sb.from("creator_works_public").select(`${WORK_COLUMNS}, logline_position`).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as WorkRow & { logline_position?: number | null };

  const blocksRes = await sb
    .from("creator_blocks_public")
    .select("id, position, kind, body, file_path, file_name, file_bytes, youtube_id, sub_kind")
    .eq("work_id", id)
    .order("position", { ascending: true })
    .order("id", { ascending: true })
    .limit(20);
  if (blocksRes.error) throw new Error(blocksRes.error.message);
  const rows = (blocksRes.data ?? []) as unknown as BlockRow[];
  const urls = await signPublicFiles(rows.map((b) => b.file_path));

  const blocks: WorkBlock[] = [];
  for (const b of rows) {
    const sub = b.sub_kind ?? undefined;
    if (b.kind === "text" && b.body) blocks.push({ id: b.id, kind: "text", body: b.body, sub });
    else if (b.kind === "video" && b.youtube_id) blocks.push({ id: b.id, kind: "video", youtubeId: b.youtube_id, sub });
    else if (b.kind === "video" && b.file_path) blocks.push({ id: b.id, kind: "video", youtubeId: null, fileName: b.file_name, fileBytes: b.file_bytes, src: urls.get(b.file_path) ?? null, sub });
    else if (b.kind === "image") blocks.push({ id: b.id, kind: "image", fileName: b.file_name, src: b.file_path ? (urls.get(b.file_path) ?? null) : null, sub });
    else if (b.kind === "document") blocks.push({ id: b.id, kind: "document", fileName: b.file_name, fileBytes: b.file_bytes, src: b.file_path ? (urls.get(b.file_path) ?? null) : null, sub });
  }
  return { ...toWorkItem(row), authorHandle: row.author_handle, authorName: row.author_name, blocks, loglinePosition: Math.max(0, row.logline_position ?? 0) };
}

// 작품 카드에 걸 대표 이미지·영상(작품 안 이미지·영상 요소를 위에서부터 차례로). 공개된 작품의 것만 돌려준다.
export type WorkMediaItem = { kind: "image"; src: string } | { kind: "video"; youtubeId: string } | { kind: "file-video"; src: string };

export async function loadWorkMedia(workIds: string[]): Promise<Map<string, WorkMediaItem[]>> {
  const out = new Map<string, WorkMediaItem[]>();
  const ids = workIds.filter((id) => UUID_QUERY.test(id)).slice(0, 12);
  if (ids.length === 0) return out;
  const { data, error } = await getSupabase()
    .from("creator_blocks_public")
    .select("work_id, kind, file_path, youtube_id, position")
    .in("work_id", ids)
    .in("kind", ["image", "video"])
    .order("position", { ascending: true })
    .order("id", { ascending: true });
  if (error) return out; // 그림을 못 읽어도 프로필은 보여 준다(자리 표시로)
  const rows = (data ?? []) as { work_id: string; kind: string; file_path: string | null; youtube_id: string | null }[];
  const urls = await signPublicFiles(rows.map((b) => b.file_path));
  for (const b of rows) {
    const list = out.get(b.work_id) ?? [];
    if (b.kind === "video" && b.youtube_id) list.push({ kind: "video", youtubeId: b.youtube_id });
    else if (b.kind === "video" && b.file_path && urls.get(b.file_path)) list.push({ kind: "file-video", src: urls.get(b.file_path) as string });
    else if (b.kind === "image" && b.file_path && urls.get(b.file_path)) list.push({ kind: "image", src: urls.get(b.file_path) as string });
    out.set(b.work_id, list);
  }
  return out;
}

// 공개 작품마다 대표(맨 위)를 repOf 규칙으로 정한다(크리에이터 상세의 작품 줄).
export async function loadWorkReps(works: { id: string; loglinePosition?: number }[]): Promise<Map<string, { rep: Rep; formats: Format[] }>> {
  const out = new Map<string, { rep: Rep; formats: Format[] }>();
  const ws = works.filter((w) => UUID_QUERY.test(w.id)).slice(0, 12);
  if (ws.length === 0) return out;
  const { data, error } = await getSupabase()
    .from("creator_blocks_public")
    .select("work_id, kind, body, file_name, sub_kind, position")
    .in("work_id", ws.map((w) => w.id))
    .order("position", { ascending: true })
    .order("id", { ascending: true });
  if (error) return out;
  type R = { work_id: string; kind: string; body: string | null; file_name: string | null; sub_kind: string | null };
  const by = new Map<string, R[]>();
  for (const b of (data ?? []) as R[]) by.set(b.work_id, [...(by.get(b.work_id) ?? []), b]);
  for (const w of ws) {
    const rb = (by.get(w.id) ?? []).map((b) => ({ kind: b.kind, sub: b.sub_kind, body: b.body, fileName: b.file_name }));
    out.set(w.id, { rep: repOf(rb, w.loglinePosition ?? 0), formats: formatsOf(rb, w.loglinePosition ?? 0) });
  }
  return out;
}

// 공개 주소 → 닉네임(받은·보낸 협업 신청 목록에서 크리에이터 이름을 보여 줄 때). 공개 프로필만 읽히므로 못 찾은 주소는 빠진다.
export async function creatorNames(handles: (string | null | undefined)[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const list = Array.from(new Set(handles.filter((h): h is string => typeof h === "string" && HANDLE_QUERY.test(h) && h.length <= 20))).slice(0, 30);
  if (list.length === 0) return out;
  try {
    const { data } = await getSupabase().from("creators_public").select("public_handle, display_name").in("public_handle", list);
    for (const r of (data ?? []) as { public_handle: string; display_name: string }[]) out.set(r.public_handle, r.display_name);
  } catch {
    // 이름을 못 읽으면 공개 주소를 보여 준다
  }
  return out;
}
