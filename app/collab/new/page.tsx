import type { Metadata } from "next";
import Link from "next/link";
import { createCollab } from "@/app/actions/collab";
import { CollabForm } from "@/components/collab-form";
import { PaperCard, PaperPage, primaryBtn } from "@/components/paper-card";
import { getCreator, getWork } from "@/lib/creators";
import { getPortfolio } from "@/lib/portfolio";
import { getSupabase } from "@/lib/supabase";
import { UUID_RE, type SourceWork } from "@/lib/collab";

export const metadata: Metadata = { title: "협업 신청" };
export const dynamic = "force-dynamic"; // 빌드 때가 아니라 열 때마다 신청 대상 목록·기획안을 읽는다

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function NewCollabPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const planParam = Array.isArray(sp.plan) ? sp.plan[0] : sp.plan;
  const creatorParam = Array.isArray(sp.creator) ? sp.creator[0] : sp.creator;
  const workParam = Array.isArray(sp.work) ? sp.work[0] : sp.work;

  // 크리에이터 목록·프로필·작품 창에서 들어온 신청: 받는 사람은 그 프로필의 주인이다(서버가 접수할 때 다시 정한다).
  // 공개 프로필이고 협업 신청을 받는 중일 때만 신청 칸을 보여 준다(작품이면 공개한 작품).
  if (planParam === undefined && (creatorParam !== undefined || workParam !== undefined)) {
    let target: { handle: string; name: string; workId?: string; workTitle?: string } | null = null;
    try {
      if (workParam !== undefined) {
        const w = UUID_RE.test(workParam) ? await getWork(workParam) : null;
        const c = w ? await getCreator(w.authorHandle) : null;
        if (w && c?.openToCollab) target = { handle: c.handle, name: c.name, workId: w.id, workTitle: w.title };
      } else if (creatorParam !== undefined) {
        const c = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/i.test(creatorParam) ? await getCreator(creatorParam.toLowerCase()) : null;
        if (c?.openToCollab) target = { handle: c.handle, name: c.name };
      }
    } catch {
      target = null;
    }
    if (!target) {
      return (
        <PaperPage>
          <PaperCard className="text-center">
            <p className="text-[15px] font-bold text-[#292126]">신청할 수 없는 크리에이터예요</p>
            <p className="mt-1 text-[13px] text-[#574a4f]">주소가 잘못되었거나, 공개가 끝났거나, 지금은 협업 신청을 받지 않는 중일 수 있어요.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/creators" className={primaryBtn}>크리에이터 둘러보기</Link>
            </div>
          </PaperCard>
        </PaperPage>
      );
    }
    return (
      <PaperPage>
        <CollabForm
          action={createCollab}
          works={[]}
          cancelHref={target.workId ? `/portfolio/${target.workId}` : `/creators/${target.handle}`}
          work={target.workId ? { id: target.workId, title: target.workTitle ?? "", recipientName: target.name } : undefined}
          creator={target.workId ? undefined : { handle: target.handle, name: target.name }}
        />
      </PaperPage>
    );
  }

  // 포트폴리오 상세에서 들어온 신청: 받는 사람은 그 기획안의 주인이다(서버가 접수할 때 다시 정한다).
  // 공개 중인 기획안이 아니면 신청 칸을 보여 주지 않는다.
  if (planParam !== undefined) {
    const plan = UUID_RE.test(planParam) ? await getPortfolio(planParam) : null;
    if (!plan) {
      return (
        <PaperPage>
          <PaperCard className="text-center">
            <p className="text-[15px] font-bold text-[#292126]">신청할 수 없는 기획안이에요</p>
            <p className="mt-1 text-[13px] text-[#574a4f]">주소가 잘못되었거나, 공개가 끝난 기획안일 수 있어요.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/portfolio" className={primaryBtn}>포트폴리오 둘러보기</Link>
            </div>
          </PaperCard>
        </PaperPage>
      );
    }
    return (
      <PaperPage>
        <CollabForm
          action={createCollab}
          works={[]}
          cancelHref={`/portfolio/${plan.id}`}
          plan={{ id: plan.id, title: plan.title, recipientName: plan.authorName }}
        />
      </PaperPage>
    );
  }

  const { data, error } = await getSupabase().from("source_works").select("id, title").order("sort_order");
  if (error) throw new Error(error.message);
  return (
    <PaperPage>
      <CollabForm action={createCollab} works={(data ?? []) as SourceWork[]} cancelHref="/" />
    </PaperPage>
  );
}
