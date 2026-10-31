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

  return <PlannerEditor key={planParam ?? "new"} loggedIn displayName={displayName} panel={panel} />;
}
