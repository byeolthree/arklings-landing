import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlannerEditor } from "@/components/planner/planner-editor";
import { getCurrentUser } from "@/lib/auth";
import { loadPlanPanel } from "@/lib/plans-server";
import { createAuthClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "기획안 만들기" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ plan?: string | string[] }>;

export default async function PlannerPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const planParam = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const user = await getCurrentUser();

  // 로그인하지 않았으면 기획안은 브라우저 안에서만 쓴다(서버에 저장하지 않는다).
  if (!user) {
    if (planParam) redirect(`/login?next=${encodeURIComponent(`/planner?plan=${planParam}`)}`);
    return <PlannerEditor loggedIn={false} displayName="" panel={null} />;
  }

  // 이메일 확인을 마치지 않은 계정(카카오 등)은 먼저 이메일을 확인한다.
  if (!user.email || !user.emailConfirmed) redirect(`/auth/add-email?next=${encodeURIComponent(planParam ? `/planner?plan=${planParam}` : "/planner")}`);

  let displayName = "";
  try {
    const sb = await createAuthClient();
    const { data } = await sb.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    displayName = data?.display_name ?? "";
  } catch {
    // 이름을 못 읽어도 화면은 연다(공개 안내에는 「이름 없음」으로 보인다).
  }

  // 내 기획안만 연다(공개된 남의 기획안은 이 화면에서 열지 않는다).
  const panel = planParam ? await loadPlanPanel(planParam, user.id) : null;
  if (planParam && !panel) notFound();

  // 내 크리에이터 프로필 상태와, 이 기획안이 붙은 작품(포트폴리오에서 보기 링크용)
  let creatorProfile: "none" | "private" | "public" = "none";
  let workId: string | null = null;
  try {
    const sb = await createAuthClient();
    const { data: cp } = await sb.from("creator_profiles").select("is_public").eq("user_id", user.id).maybeSingle();
    if (cp) creatorProfile = (cp as { is_public: boolean }).is_public ? "public" : "private";
    if (panel) {
      const { data: w } = await sb.from("creator_works").select("id").eq("owner_id", user.id).eq("plan_id", panel.plan.id).maybeSingle();
      workId = (w as { id: string } | null)?.id ?? null;
    }
  } catch {
    // 읽지 못하면 프로필이 없는 것처럼 보여 준다(올릴 때 서버가 다시 확인한다)
  }

  return <PlannerEditor key={planParam ?? "new"} loggedIn displayName={displayName} panel={panel} creatorProfile={creatorProfile} workId={workId} />;
}
