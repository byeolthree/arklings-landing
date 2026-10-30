import { createAdminClient } from "@/lib/supabase/admin";

// 「이메일 없이 들어온 소셜 계정」의 이어주기 요청(pending_identity_links)을 찾는 도우미. 서버 전용 열쇠를 쓴다.
export const PENDING_MAX_AGE_MS = 60 * 60 * 1000; // 요청 뒤 1시간 안에 승인해야 한다

export type PendingLink = { sourceUserId: string; provider: string; targetEmail: string; createdAt: string };

export async function findPendingLink(email: string): Promise<PendingLink | null> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - PENDING_MAX_AGE_MS).toISOString();
  const { data } = await admin
    .from("pending_identity_links")
    .select("source_user_id, provider, target_email, created_at")
    .eq("target_email", email.trim().toLowerCase())
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  const row = data?.[0];
  if (!row) return null;
  return {
    sourceUserId: row.source_user_id as string,
    provider: row.provider as string,
    targetEmail: row.target_email as string,
    createdAt: row.created_at as string,
  };
}
