// 내 크리에이터 데이터 읽기(마이페이지, 비공개 프로필·작품 미리 보기). 로그인한 본인 연결(createAuthClient)과 RLS로만 읽는다.
// 공개용 보기(lib/creators.ts)와 달리 비공개도 읽으므로 반드시 본인 확인을 마친 사용자 번호로만 부른다. 화면으로 넘기는 값에는 내 번호를 싣지 않는다.
import type { Role } from "@/lib/collab";
import { isRole } from "@/lib/creator-rules";
import { signOwnFiles } from "@/lib/creator-files";
import type { WorkBlock, WorkListItem } from "@/lib/creators";
import { createAuthClient } from "@/lib/supabase/server";

export type MyProfile = {
  handle: string;
  roles: Role[];
  bio: string;
  channels: { label: string; url: string }[];
  openToCollab: boolean;
  isPublic: boolean;
};

export type MyBlock = WorkBlock;
export type MyWork = WorkListItem & {
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
  logline: string; plan_id: string | null; is_public: boolean; first_published_at: string | null; created_at: string;
};
type BlockRow = {
  id: string; work_id: string; position: number; kind: "text" | "image" | "video" | "document";
  body: string | null; file_path: string | null; file_name: string | null; file_bytes: number | null; youtube_id: string | null;
};

export async function loadMyCreator(userId: string): Promise<MyCreatorData> {
  const sb = await createAuthClient();
  const [prof, chans, works, blocks] = await Promise.all([
    sb.from("creator_profiles").select("public_handle, roles, bio, open_to_collab, is_public").eq("user_id", userId).maybeSingle(),
    sb.from("creator_channels").select("label, url, position").eq("user_id", userId).order("position", { ascending: true }),
    sb.from("creator_works").select("id, title, roles, genres, kind, form, logline, plan_id, is_public, first_published_at, created_at").eq("owner_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    sb.from("creator_work_blocks").select("id, work_id, position, kind, body, file_path, file_name, file_bytes, youtube_id").eq("owner_id", userId).order("position", { ascending: true }).order("created_at", { ascending: true }),
  ]);
  for (const r of [prof, chans, works, blocks]) if (r.error) throw new Error(r.error.message);

  const brows = (blocks.data ?? []) as unknown as BlockRow[];
  const urls = await signOwnFiles(userId, brows.map((b) => b.file_path));
  const byWork = new Map<string, MyBlock[]>();
  let used = 0;
  for (const b of brows) {
    used += b.file_bytes ?? 0;
    const list = byWork.get(b.work_id) ?? [];
    if (b.kind === "text" && b.body) list.push({ id: b.id, kind: "text", body: b.body });
    else if (b.kind === "video" && b.youtube_id) list.push({ id: b.id, kind: "video", youtubeId: b.youtube_id });
    else if (b.kind === "image") list.push({ id: b.id, kind: "image", fileName: b.file_name, src: b.file_path ? (urls.get(b.file_path) ?? null) : null });
    else if (b.kind === "document") list.push({ id: b.id, kind: "document", fileName: b.file_name, fileBytes: b.file_bytes, src: b.file_path ? (urls.get(b.file_path) ?? null) : null });
    byWork.set(b.work_id, list);
  }

  const p = prof.data as unknown as { public_handle: string; roles: string[]; bio: string; open_to_collab: boolean; is_public: boolean } | null;
  return {
    profile: p
      ? {
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
      isPublic: w.is_public,
      planId: w.plan_id,
      blocks: byWork.get(w.id) ?? [],
    })),
    usedBytes: used,
  };
}
