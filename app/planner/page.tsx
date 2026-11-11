import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlannerEditor } from "@/components/planner/planner-editor";
import { TrackOnMount } from "@/components/track-on-mount";
import { getCurrentUser } from "@/lib/auth";
import { readAiRemaining } from "@/lib/ai/usage";
import { loadPlanPanel } from "@/lib/plans-server";
import { createAuthClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "기획안 만들기" };
export const dynamic = "force-dynamic";
export const maxDuration = 60; // AI 평가(Server Action)가 모델을 기다리는 시간의 서버 전체 상한(초). 평가 호출 상한(30초)보다 길게 둔다.

type SearchParams = Promise<{ plan?: string | string[]; step?: string | string[] }>;

export default async function PlannerPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const planParam = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const stepParam = Array.isArray(params.step) ? params.step[0] : params.step;
  const user = await getCurrentUser();

  // 로그인하지 않았으면 기획안은 브라우저 안에서만 쓴다(서버에 저장하지 않는다).
  if (!user) {
    if (planParam) redirect(`/login?next=${encodeURIComponent(`/planner?plan=${planParam}`)}`);
    return (
      <>
        <TrackOnMount event="planner_open" />
        <PlannerEditor loggedIn={false} displayName="" panel={null} />
      </>
    );
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

  // 이 기획안이 붙은 작품(있으면 「이어서 작성하기」, 올라가 있으면 「포트폴리오에서 보기」)
  let workId: string | null = null;
  let workPublic = false;
  if (panel) {
    try {
      const sb = await createAuthClient();
      const { data: w } = await sb.from("creator_works").select("id, is_public").eq("owner_id", user.id).eq("plan_id", panel.plan.id).maybeSingle();
      const row = w as { id: string; is_public: boolean } | null;
      workId = row?.id ?? null;
      workPublic = row?.is_public ?? false;
    } catch {
      // 못 읽으면 작품이 없는 것처럼 보인다(누르면 서버가 다시 확인한다)
    }
  }

  // 오늘 남은 AI 평가 수(읽지 못하면 null → 패널은 「남은 ○번」 줄을 보이지 않는다)
  let evalRemaining: number | null = null;
  try {
    evalRemaining = await readAiRemaining(await createAuthClient(), "evaluate_logline");
  } catch {
    evalRemaining = null;
  }

  return (
    <>
      <TrackOnMount event="planner_open" />
      <PlannerEditor key={planParam ?? "new"} loggedIn displayName={displayName} panel={panel} workId={workId} workPublic={workPublic} initialStep={panel && stepParam === "2" ? 2 : 1} evalRemaining={evalRemaining} />
    </>
  );
}
