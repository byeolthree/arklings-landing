import { UUID_RE } from "@/lib/collab";
import { fromStored, previewOf, type PlanDraft, type PlanPanel } from "@/lib/plans";
import { createAuthClient } from "@/lib/supabase/server";
import { formatKst } from "@/lib/time";

// 내 기획안 한 건과 임시저장 이력 목록을 읽는다. 내 것이 아니거나 없으면 null.
// 로그인한 본인의 권한(RLS)으로 읽고, 코드에서도 주인(ownerId)을 한 번 더 확인한다.
export async function loadPlanPanel(planId: string, ownerId: string): Promise<PlanPanel | null> {
  if (!UUID_RE.test(planId)) return null;
  const sb = await createAuthClient();
  const { data: row } = await sb
    .from("plans")
    .select("id, title, is_public, published_at")
    .eq("id", planId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!row) return null;

  const { data: revs } = await sb
    .from("plan_revisions")
    .select("id, created_at, selections, edited")
    .eq("plan_id", row.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const title = row.title as string;
  const revisions = (revs ?? []).map((r) => {
    const d = fromStored(title, r.selections, r.edited);
    return {
      id: r.id as string,
      createdAt: formatKst(r.created_at as string),
      preview: d ? previewOf(d) : "(읽을 수 없는 기록)",
      edited: Boolean(d && d.edited !== null),
    };
  });
  const latestRow = revs?.[0];
  const latest: PlanDraft = (latestRow && fromStored(title, latestRow.selections, latestRow.edited)) || {
    title,
    slots: ["", "", "", "", ""],
    checks: Array(21).fill("") as PlanDraft["checks"],
    edited: null,
  };
  return {
    plan: { id: row.id as string, isPublic: row.is_public as boolean, publishedAt: row.published_at ? formatKst(row.published_at as string) : null },
    revisions,
    latest,
  };
}
