// 내 크리에이터 데이터 읽기(마이페이지, 비공개 프로필·작품 미리 보기). 로그인한 본인 연결(createAuthClient)과 RLS로만 읽는다.
// 공개용 보기(lib/creators.ts)와 달리 비공개도 읽으므로 반드시 본인 확인을 마친 사용자 번호로만 부른다. 화면으로 넘기는 값에는 내 번호를 싣지 않는다.
import type { Role } from "@/lib/collab";
import { isRole } from "@/lib/creator-rules";
import { signOwnFiles, whyNoOwnUrl } from "@/lib/creator-files";
import type { WorkBlock, WorkListItem } from "@/lib/creators";
import { createAuthClient } from "@/lib/supabase/server";

export type MyProfile = {
  hero?: { kind: "image" | "video"; bytes: number; src: string | null }; // 대표 이미지·영상(src는 본인에게만 보이는 짧은 임시 주소)
  handle: string;
  roles: Role[];
  bio: string;
  channels: { label: string; url: string }[];
  openToCollab: boolean;
  isPublic: boolean;
};

export type MyBlock = WorkBlock;
export type MyWork = WorkListItem & {
  loglinePosition: number; // 로그라인 앞에 있는 요소의 개수(0이면 맨 위, D35-2)
  updatedAt: string; // 마지막으로 고친 시각(ISO). 접은 목록의 「수정일」
  isPublic: boolean;
  planId: string | null;
  blocks: MyBlock[];
};

export type MyCreatorData = {
  profile: MyProfile | null;
  works: MyWork[];
  usedBytes: number; // 이미지+PDF 합계(사람당 20MB 한도)
};

type WorkRow = {
  id: string; title: string; roles: string[]; genres: string[] | null; kind: string | null; form: string | null;
  logline: string; plan_id: string | null; is_public: boolean; first_published_at: string | null; created_at: string; updated_at: string; logline_position?: number | null;
};
type BlockRow = {
  id: string; work_id: string; position: number; kind: "text" | "image" | "video" | "document";
  body: string | null; file_path: string | null; file_name: string | null; file_bytes: number | null; youtube_id: string | null; sub_kind?: string | null;
};

export async function loadMyCreator(userId: string): Promise<MyCreatorData> {
  const sb = await createAuthClient();
  const workCols = "id, title, roles, genres, kind, form, logline, plan_id, is_public, first_published_at, created_at, updated_at";
  const readWorks = (cols: string) => sb.from("creator_works").select(cols).eq("owner_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  const [prof, chans, works, blocks] = await Promise.all([
    sb.from("creator_profiles").select("public_handle, roles, bio, open_to_collab, is_public, hero_kind, hero_path, hero_bytes").eq("user_id", userId).maybeSingle(),
    sb.from("creator_channels").select("label, url, position").eq("user_id", userId).order("position", { ascending: true }),
    readWorks(`${workCols}, logline_position`),
    sb.from("creator_work_blocks").select("id, work_id, position, kind, body, file_path, file_name, file_bytes, youtube_id, sub_kind").eq("owner_id", userId).order("position", { ascending: true }).order("created_at", { ascending: true }),
  ]);
  for (const r of [prof, chans, works, blocks]) if (r.error) throw new Error(r.error.message);

  const brows = (blocks.data ?? []) as unknown as BlockRow[];
  const urls = await signOwnFiles(userId, brows.map((b) => b.file_path));
  const whys = new Map<string, string>();
  for (const b of brows) if (b.file_path && !urls.get(b.file_path)) whys.set(b.file_path, await whyNoOwnUrl(userId, b.file_path));
  const byWork = new Map<string, MyBlock[]>();
  let used = 0;
  for (const b of brows) {
    used += b.file_bytes ?? 0;
    const list = byWork.get(b.work_id) ?? [];
    const sub = b.sub_kind ?? undefined;
    if (b.kind === "text" && b.body) list.push({ id: b.id, kind: "text", body: b.body, sub });
    else if (b.kind === "video" && b.youtube_id) list.push({ id: b.id, kind: "video", youtubeId: b.youtube_id, sub });
    else if (b.kind === "video" && b.file_path) list.push({ id: b.id, kind: "video", youtubeId: null, fileName: b.file_name, fileBytes: b.file_bytes, src: urls.get(b.file_path) ?? null, sub, why: whys.get(b.file_path) });
    else if (b.kind === "image") list.push({ id: b.id, kind: "image", fileName: b.file_name, src: b.file_path ? (urls.get(b.file_path) ?? null) : null, why: b.file_path ? whys.get(b.file_path) : undefined });
    else if (b.kind === "document") list.push({ id: b.id, kind: "document", fileName: b.file_name, fileBytes: b.file_bytes, src: b.file_path ? (urls.get(b.file_path) ?? null) : null, sub, why: b.file_path ? whys.get(b.file_path) : undefined });
    byWork.set(b.work_id, list);
  }

  const p = prof.data as unknown as { public_handle: string; roles: string[]; bio: string; open_to_collab: boolean; is_public: boolean; hero_kind: "image" | "video" | null; hero_path: string | null; hero_bytes: number | null } | null;
  const heroUrls = p?.hero_path ? await signOwnFiles(userId, [p.hero_path]) : new Map<string, string>();
  return {
    profile: p
      ? {
          hero: p.hero_kind && p.hero_path && p.hero_bytes ? { kind: p.hero_kind, bytes: p.hero_bytes, src: heroUrls.get(p.hero_path) ?? null } : undefined,
          handle: p.public_handle,
          roles: (p.roles ?? []).filter(isRole),
          bio: p.bio ?? "",
          channels: ((chans.data ?? []) as { label: string; url: string }[]).map((c) => ({ label: c.label, url: c.url })),
          openToCollab: p.open_to_collab,
          isPublic: p.is_public,
        }
      : null,
    works: ((works.data ?? []) as unknown as WorkRow[]).map((w) => ({
      id: w.id,
      title: w.title,
      logline: w.logline ?? "",
      roles: (w.roles ?? []).filter(isRole),
      genres: w.genres ?? [],
      kind: w.kind,
      form: w.form === "long" || w.form === "short" ? w.form : null,
      publishedAt: w.first_published_at ?? w.created_at,
      updatedAt: w.updated_at,
      loglinePosition: Math.max(0, w.logline_position ?? 0),
      isPublic: w.is_public,
      planId: w.plan_id,
      blocks: byWork.get(w.id) ?? [],
    })),
    usedBytes: used + (p?.hero_bytes ?? 0), // 작품 요소 파일 + 대표 이미지·영상(합계 20MB에 센다)
  };
}
