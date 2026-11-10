import { createAuthClient } from "@/lib/supabase/server";

// 내게 온 협업 신청 중 아직 「접수」 상태(= 새 신청)인 개수. 로그인한 본인의 권한으로 세므로 DB 규칙(RLS)이 내 것만 돌려준다.
// 세지 못하면 null을 돌려 주고, 화면에서는 개수 표시만 생략한다.
export async function countNewCollab(): Promise<number | null> {
  try {
    const { count, error } = await (await createAuthClient())
      .from("collab_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "received");
    return error ? null : (count ?? 0);
  } catch {
    return null;
  }
}

export type NewCollabNotice = { id: string; applicant: string; target: string; createdAt: string };

// 상단 종 아이콘에 보일 새 협업 신청(「접수」 상태) 최근 몇 건. 내 것만 오도록 로그인한 본인의 권한(RLS)으로 읽는다.
// 읽지 못하면 빈 목록을 돌려 주고 화면은 목록만 비운다(개수는 countNewCollab이 따로 센다).
export async function listNewCollab(limit = 5): Promise<NewCollabNotice[]> {
  try {
    const { data, error } = await (await createAuthClient())
      .from("collab_requests")
      .select("id, applicant_name, created_at, plan_id, source_works(title), plans(title)")
      .eq("status", "received")
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(limit, 10)));
    if (error) return [];
    return ((data ?? []) as unknown as { id: string; applicant_name: string; created_at: string; plan_id: string | null; source_works: { title: string } | null; plans: { title: string } | null }[]).map((r) => ({
      id: r.id,
      applicant: r.applicant_name,
      target: r.plan_id ? (r.plans?.title ?? "") : (r.source_works?.title ?? ""),
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}
