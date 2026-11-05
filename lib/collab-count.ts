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
