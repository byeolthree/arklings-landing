// 크리에이터·작품 읽기(누구나 보는 화면). 목록·프로필·작품 상세 화면은 이 파일의 함수만 부른다.
// DB의 공개용 보기(view) 4개(creators_public, creator_channels_public, creator_works_public, creator_blocks_public)에서만 읽고,
// 로그인 없는 연결(lib/supabase.ts)을 쓴다. 보기에는 공개 프로필의 공개 작품만 있고 주인 번호(UUID)·이메일은 한 칸도 없다.
// 화면으로 넘기는 값에도 싣지 않는다. 파일은 비공개 보관함에 있어서, 공개용 보기에 올라와 있는 것만 짧은 임시 주소로 바꿔 준다(lib/creator-files.ts).
import type { Role } from "@/lib/collab";
import { isRole } from "@/lib/creator-rules";
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
  | { id: string; kind: "text"; body: string }
  | { id: string; kind: "image"; fileName: string | null; src: string | null }
  | { id: string; kind: "video"; youtubeId: string }
  | { id: string; kind: "document"; fileName: string | null; fileBytes: number | null; src: string | null };

export type WorkDetail = WorkListItem & {
  authorHandle: string;
  authorName: string;
  blocks: WorkBlock[]; // 만든 사람이 정한 순서
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

// 공개 프로필 목록. 최근에 만든 순서로 page쪽(1부터)의 CREATOR_PAGE_SIZE명과 전체 인원을 돌려준다.
export async function listCreators(filter: CreatorFilterInput, page: number): Promise<{ items: CreatorListItem[]; total: number }> {
  const sb = getSupabase();
  const from = (Math.max(1, page) - 1) * CREATOR_PAGE_SIZE;
  let query = sb.from("creators_public").select(CREATOR_COLUMNS, { count: "exact" });
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
      let countQuery = sb.from("creators_public").select("public_handle", { count: "exact", head: true });
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
  return { items: rows.map((r) => toListItem(r, heroUrls)), total: count ?? 0 };
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
  const { data, error } = await sb.from("creator_works_public").select(WORK_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as WorkRow;

  const blocksRes = await sb
    .from("creator_blocks_public")
    .select("id, position, kind, body, file_path, file_name, file_bytes, youtube_id")
    .eq("work_id", id)
    .order("position", { ascending: true })
    .order("id", { ascending: true })
    .limit(20);
  if (blocksRes.error) throw new Error(blocksRes.error.message);
  const rows = (blocksRes.data ?? []) as unknown as BlockRow[];
  const urls = await signPublicFiles(rows.map((b) => b.file_path));

  const blocks: WorkBlock[] = [];
  for (const b of rows) {
    if (b.kind === "text" && b.body) blocks.push({ id: b.id, kind: "text", body: b.body });
    else if (b.kind === "video" && b.youtube_id) blocks.push({ id: b.id, kind: "video", youtubeId: b.youtube_id });
    else if (b.kind === "image") blocks.push({ id: b.id, kind: "image", fileName: b.file_name, src: b.file_path ? (urls.get(b.file_path) ?? null) : null });
    else if (b.kind === "document") blocks.push({ id: b.id, kind: "document", fileName: b.file_name, fileBytes: b.file_bytes, src: b.file_path ? (urls.get(b.file_path) ?? null) : null });
  }
  return { ...toWorkItem(row), authorHandle: row.author_handle, authorName: row.author_name, blocks };
}
