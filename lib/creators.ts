// 크리에이터·작품 읽기(누구나 보는 화면). 목록·프로필·작품 상세 화면은 이 파일의 함수만 부른다.
// DB의 공개용 보기(view) 4개(creators_public, creator_channels_public, creator_works_public, creator_blocks_public)에서만 읽고,
// 로그인 없는 연결(lib/supabase.ts)을 쓴다. 보기에는 공개 프로필의 공개 작품만 있고 주인 번호(UUID)·이메일은 한 칸도 없다.
// 화면으로 넘기는 값에도 싣지 않는다. 파일은 비공개 보관함에 있어서, 공개용 보기에 올라와 있는 것만 짧은 임시 주소로 바꿔 준다(lib/creator-files.ts).
import { orderItems } from "@/lib/creator-cards";
import type { Role } from "@/lib/collab";
import { isRole, LOGLINE_TOKEN } from "@/lib/creator-rules";
import { signPublicFiles } from "@/lib/creator-files";
import { getSupabase } from "@/lib/supabase";

export const CREATOR_PAGE_SIZE = 12;

export type HeroKind = "image" | "video";
export type WorkForm = "long" | "short";

export type CreatorFilterInput = { q?: string; role?: Role; genre?: string; form?: WorkForm; open?: boolean };

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
  cover?: string; // 가장 최근 공개 작품의 대표(작품 안 맨 위에 놓인 것, D35-2)가 이미지·영상일 때 그 그림 주소. 영상 제작·아트디렉터 역할이 있는 사람만 채워진다
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
};

export type WorkBlock =
  | { id: string; kind: "text"; body: string; sub?: string }
  | { id: string; kind: "image"; fileName: string | null; fileBytes?: number | null; src: string | null; sub?: string }
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
};
const WORK_COLUMNS = "id, author_handle, author_name, title, roles, genres, kind, form, logline, published_at";

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

// 공개 프로필 중 공개한 작품이 1건 이상인 크리에이터 목록. 최근에 만든 순서로 page쪽(1부터)의 CREATOR_PAGE_SIZE명과 전체 인원을 돌려준다.
export async function listCreators(filter: CreatorFilterInput, page: number): Promise<{ items: CreatorListItem[]; total: number }> {
  const sb = getSupabase();
  const from = (Math.max(1, page) - 1) * CREATOR_PAGE_SIZE;
  // 프로필만으로는 목록에 나오지 않는다. 공개한 작품이 1건 이상인 크리에이터만 나온다(별뜨리님 결정 2026-11-07).
  let query = sb.from("creators_public").select(CREATOR_COLUMNS, { count: "exact" }).gte("work_count", 1);
  if (filter.role) query = query.contains("roles", [filter.role]);
  if (filter.genre) query = query.contains("genres", [filter.genre]);
  if (filter.form) query = query.contains("forms", [filter.form]);
  if (filter.open) query = query.eq("open_to_collab", true);
  const q = cleanQuery(filter.q ?? "");
  if (q) {
    const like = `%${q}%`;
    query = query.or(`display_name.ilike.${like},bio.ilike.${like},latest_title.ilike.${like},latest_logline.ilike.${like}`);
  }
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("public_handle", { ascending: true })
    .range(from, from + CREATOR_PAGE_SIZE - 1);

  if (error) {
    // 마지막 쪽보다 뒤의 쪽(?page=99)은 오류가 아니라 「이 쪽에는 없어요」로 보여 준다.
    if (error.code === "PGRST103") {
      let countQuery = sb.from("creators_public").select("public_handle", { count: "exact", head: true }).gte("work_count", 1);
      if (filter.role) countQuery = countQuery.contains("roles", [filter.role]);
      if (filter.genre) countQuery = countQuery.contains("genres", [filter.genre]);
      if (filter.form) countQuery = countQuery.contains("forms", [filter.form]);
      if (filter.open) countQuery = countQuery.eq("open_to_collab", true);
      if (q) {
        const like = `%${q}%`;
        countQuery = countQuery.or(`display_name.ilike.${like},bio.ilike.${like},latest_title.ilike.${like},latest_logline.ilike.${like}`);
      }
      const { count: total, error: countError } = await countQuery;
      if (countError) throw new Error(countError.message);
      return { items: [], total: total ?? 0 };
    }
    throw new Error(error.message);
  }
  const rows = (data ?? []) as unknown as CreatorRow[];
  const heroUrls = await signPublicFiles(rows.map((r) => r.hero_path));
  // 대표 이미지·영상을 카드 맨 위에 거는 것은 역할에 영상 제작이나 아트디렉터가 있는 사람만이다(별뜨리님 규칙).
  // 카드에 먼저 보이는 작품은 그 크리에이터가 포트폴리오 등록 목록에서 맨 위에 올려 둔 작품이다(손잡이로 정한 순서).
  const featured = await loadFeatured(rows.map((r) => r.public_handle));
  const covers = await loadCovers(rows.filter((r) => asRoles(r.roles).some((x) => x === "video" || x === "art_director")).map((r) => r.public_handle), featured);
  return {
    items: rows.map((r) => {
      const base = toListItem(r, heroUrls);
      const f = featured.get(r.public_handle);
      return { ...base, latest: f ? { title: f.title, logline: f.logline, genres: f.genres } : base.latest, cover: covers.get(r.public_handle)?.src, coverKind: covers.get(r.public_handle)?.kind };
    }),
    total: count ?? 0,
  };
}

type FeaturedWork = { id: string; title: string; logline: string; genres: string[]; loglinePosition: number };
// 크리에이터마다 공개 작품 중 등록 목록의 맨 위 작품(순서 번호가 가장 작은 것, 같으면 최근 공개)을 돌려준다.
async function loadFeatured(handles: string[]): Promise<Map<string, FeaturedWork>> {
  const out = new Map<string, FeaturedWork>();
  if (handles.length === 0) return out;
  const works = await getSupabase()
    .from("creator_works_public")
    .select("id, author_handle, title, logline, genres, logline_position")
    .in("author_handle", handles)
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false })
    .order("id", { ascending: false });
  if (works.error) return out;
  type W = { id: string; author_handle: string; title: string; logline: string | null; genres: string[] | null; logline_position: number | null };
  for (const w of (works.data ?? []) as W[]) {
    if (!out.has(w.author_handle)) out.set(w.author_handle, { id: w.id, title: w.title, logline: w.logline ?? "", genres: w.genres ?? [], loglinePosition: w.logline_position ?? 0 });
  }
  return out;
}

// 그 크리에이터들이 카드에 먼저 보이게 정한 작품(등록 목록 맨 위)에서 「대표」(D35-2: 작품 안에서 맨 위에 놓인 것)가 이미지·영상이면 그 그림 주소를 돌려준다.
// 맨 위가 로그라인이거나 글·문서면 그 사람은 빠진다(카드는 로그라인 모양으로 나온다). 영상은 유튜브라서 유튜브가 주는 대표 그림을 쓴다.
async function loadCovers(handles: string[], featured: Map<string, FeaturedWork>): Promise<Map<string, { src: string; kind: "image" | "video" }>> {
  const out = new Map<string, { src: string; kind: "image" | "video" }>();
  if (handles.length === 0) return out;
  const sb = getSupabase();
  const latest = new Map<string, { id: string; loglinePosition: number }>(); // handle → 카드에 먼저 보이는 작품
  for (const h of handles) {
    const f = featured.get(h);
    if (f) latest.set(h, { id: f.id, loglinePosition: f.loglinePosition });
  }
  const ids = Array.from(latest.values()).map((w) => w.id);
  if (ids.length === 0) return out;
  const blocks = await sb
    .from("creator_blocks_public")
    .select("work_id, kind, file_path, youtube_id, position")
    .in("work_id", ids)
    .order("position", { ascending: true })
    .order("id", { ascending: true });
  if (blocks.error) return out;
  type Row = { work_id: string; kind: string; file_path: string | null; youtube_id: string | null };
  const byWork = new Map<string, Row[]>();
  for (const b of (blocks.data ?? []) as Row[]) byWork.set(b.work_id, [...(byWork.get(b.work_id) ?? []), b]);
  // 작품마다 로그라인을 그 자리에 끼운 순서에서 맨 위가 이미지·영상일 때만 대표 그림이 된다.
  const topByWork = new Map<string, Row>();
  for (const w of latest.values()) {
    const top = orderItems(byWork.get(w.id) ?? [], w.loglinePosition)[0];
    if (top !== LOGLINE_TOKEN && (top.kind === "image" || top.kind === "video")) topByWork.set(w.id, top);
  }
  const urls = await signPublicFiles(Array.from(topByWork.values()).map((b) => b.file_path));
  for (const [handle, w] of latest) {
    const b = topByWork.get(w.id);
    if (!b) continue;
    // 유튜브 영상은 유튜브가 주는 대표 그림, 올린 MP4는 그 영상 파일 그대로(카드가 소리 없이 재생), 이미지는 그 이미지.
    if (b.kind === "video" && b.youtube_id) out.set(handle, { src: `https://i.ytimg.com/vi/${b.youtube_id}/hqdefault.jpg`, kind: "image" });
    else {
      const src = b.file_path ? (urls.get(b.file_path) ?? null) : null;
      if (src) out.set(handle, { src, kind: b.kind === "video" ? "video" : "image" });
    }
  }
  return out;
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
