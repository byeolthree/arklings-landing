import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotFoundView } from "@/components/creators/state-views";
import { ApplyForm } from "@/components/projects/apply-form";
import { projectsClosed } from "@/components/projects/sample-data";
import { requireUser } from "@/lib/auth";
import { getPublicProject, hasCreatorProfile, listMyWorks, myApplicationStatus, rewardLabel } from "@/lib/projects";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "지원서 쓰기 · 프로젝트", robots: { index: false } };
export const dynamic = "force-dynamic";

// 지원서 화면. 로그인·이메일 확인을 마친 사람만 열고, 모집 중인 공고에 아직 지원하지 않았을 때만 쓸 수 있다.
// 지원하기에 필요한 것(크리에이터 프로필, 붙일 내 작품)이 없으면 만들러 가는 안내를 보여 준다. 처리는 applyToProject가 한다(DB 함수가 한 번 더 확인).
export default async function ApplyPage({ params }: Props) {
  if (projectsClosed()) notFound();
  const { id } = await params;
  const user = await requireUser(`/projects/${id}/apply`);
  const { project, failed } = await getPublicProject(id);
  if (failed) return <NotFoundView title="공고를 불러오지 못했어요" text="잠시 뒤에 다시 열어 주세요." href="/projects" label="프로젝트 목록 보기" />;
  if (!project) notFound();

  const back = `/projects/${project.id}`;
  if (project.status !== "open") {
    return <NotFoundView title={project.status === "soon" ? "아직 모집이 시작되지 않았어요" : "모집이 마감된 공고예요"} text="지금은 이 공고에 지원할 수 없어요." href={back} label="공고로 돌아가기" />;
  }
  const mine = await myApplicationStatus(project.id, user.id);
  if (mine) return <NotFoundView title="이미 지원한 공고예요" text="지원 결과는 내 지원 현황에서 볼 수 있어요." href="/mypage/applications" label="내 지원 현황 보기" />;

  const [profile, works] = await Promise.all([hasCreatorProfile(user.id), listMyWorks(user.id)]);
  if (profile === false) {
    return <NotFoundView title="크리에이터 프로필이 필요해요" text="프로젝트에 지원하려면 크리에이터 프로필을 먼저 만들어 주세요." href="/portfolio/new?step=profile" label="프로필 만들기" />;
  }
  if (works === null || profile === null) return <NotFoundView title="지원 준비를 불러오지 못했어요" text="잠시 뒤에 다시 열어 주세요." href={back} label="공고로 돌아가기" />;
  if (works.length === 0) {
    return <NotFoundView title="지원서에 붙일 작품이 필요해요" text="지원서에는 내 작품을 포트폴리오로 함께 보내요. 작품을 먼저 등록해 주세요." href="/portfolio/new" label="작품 등록하기" />;
  }
  return <ApplyForm projectId={project.id} title={project.title} reward={rewardLabel(project)} works={works} />;
}
