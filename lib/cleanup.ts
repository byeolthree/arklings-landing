import { BUCKET } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase/admin";

// 정기 정리 작업. 서버 전용 열쇠로 실행하므로 호출하는 쪽(예약 작업 경로)이 반드시 비밀값을 먼저 확인한다.
//  1) 접수한 지 3개월이 지난 협업 신청과 첨부 파일 삭제 (탈퇴한 사람 앞 신청 포함)
//  2) 신청과 연결되지 않은 짝 없는 파일 삭제(하루 이상 지난 것만 → 방금 올리는 중인 파일은 건드리지 않는다)
//  3) 오래된 봇 방지 기록·메일 횟수 기록 삭제
export const RETENTION_MONTHS = 3;
const BATCH = 200;
const MAX_BATCHES = 25;
const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_ORPHAN_DELETES = 500;

export type CleanupResult = {
  deletedRequests: number;
  deletedFiles: number;
  orphanFiles: number;
  deletedOther: number;
  errors: string[];
};

export function cutoffDate(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - RETENTION_MONTHS);
  return d;
}

export async function runCleanup(now: Date = new Date()): Promise<CleanupResult> {
  const sb = createAdminClient();
  const r: CleanupResult = { deletedRequests: 0, deletedFiles: 0, orphanFiles: 0, deletedOther: 0, errors: [] };
  // 오류 종류만 적는다(주소·열쇠 같은 값이 기록에 남지 않게).
  const fail = (what: string, e: unknown) => {
    const err = e as { message?: string; cause?: { code?: string } };
    r.errors.push(`${what}: ${err?.cause?.code ?? err?.message ?? "알 수 없는 오류"}`.slice(0, 200));
  };

  // 1) 3개월 지난 신청
  const cutoff = cutoffDate(now).toISOString();
  for (let i = 0; i < MAX_BATCHES; i += 1) {
    const { data, error } = await sb.from("collab_requests").select("id, attachment_path").lt("created_at", cutoff).limit(BATCH);
    if (error) { fail("만료 신청 조회", error); break; }
    if (!data || data.length === 0) break;
    const ids = data.map((x) => x.id as string);
    const paths = data.map((x) => x.attachment_path as string | null).filter((p): p is string => !!p);
    // 파일을 먼저 지우고, 지운 파일만큼만 신청을 지운다. 파일 지우기가 실패하면 신청을 남겨 다음 실행에서 다시 시도한다.
    if (paths.length > 0) {
      const { error: rmErr } = await sb.storage.from(BUCKET).remove(paths);
      if (rmErr) { fail("첨부 파일 삭제", rmErr); break; }
      r.deletedFiles += paths.length;
    }
    const { error: delErr } = await sb.from("collab_requests").delete().in("id", ids);
    if (delErr) { fail("만료 신청 삭제", delErr); break; }
    r.deletedRequests += ids.length;
    if (data.length < BATCH) break;
  }

  // 2) 짝 없는 파일(고아 파일)
  try {
    const root = await sb.storage.from(BUCKET).list("", { limit: 1000 });
    if (root.error) throw root.error;
    for (const folder of root.data ?? []) {
      if (r.orphanFiles >= MAX_ORPHAN_DELETES) break;
      if (folder.id) continue; // 파일이 아니라 월별 폴더(YYYY-MM)만 훑는다
      const files = await sb.storage.from(BUCKET).list(folder.name, { limit: 1000 });
      if (files.error) throw files.error;
      const old = (files.data ?? []).filter((f) => f.id && f.created_at && now.getTime() - new Date(f.created_at).getTime() > ORPHAN_MIN_AGE_MS);
      for (let k = 0; k < old.length; k += 100) {
        const chunk = old.slice(k, k + 100).map((f) => `${folder.name}/${f.name}`);
        const { data: used, error: usedErr } = await sb.from("collab_requests").select("attachment_path").in("attachment_path", chunk);
        if (usedErr) throw usedErr;
        const usedSet = new Set((used ?? []).map((u) => u.attachment_path as string));
        const orphans = chunk.filter((p) => !usedSet.has(p)).slice(0, MAX_ORPHAN_DELETES - r.orphanFiles);
        if (orphans.length > 0) {
          const { error: rmErr } = await sb.storage.from(BUCKET).remove(orphans);
          if (rmErr) throw rmErr;
          r.orphanFiles += orphans.length;
        }
      }
    }
  } catch (e) {
    fail("짝 없는 파일 정리", e);
  }

  // 3) 오래된 기록
  try {
    const attemptsBefore = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const a = await sb.from("submit_attempts").delete().lt("created_at", attemptsBefore).select("id");
    if (a.error) throw a.error;
    r.deletedOther += a.data?.length ?? 0;
    const dayBefore = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const m = await sb.from("mail_usage").delete().lt("day", dayBefore).select("user_id");
    if (m.error) throw m.error;
    r.deletedOther += m.data?.length ?? 0;
  } catch (e) {
    fail("오래된 기록 정리", e);
  }

  // 실행 기록(실패해도 정리 결과는 응답으로 돌려준다)
  try {
    await sb.from("cleanup_runs").insert({
      ran_at: now.toISOString(),
      deleted_requests: r.deletedRequests,
      deleted_files: r.deletedFiles,
      orphan_files: r.orphanFiles,
      deleted_other: r.deletedOther,
      errors: r.errors.length ? r.errors.join(" / ") : null,
      ok: r.errors.length === 0,
    });
  } catch {
    r.errors.push("실행 기록을 남기지 못했습니다.");
  }
  return r;
}
