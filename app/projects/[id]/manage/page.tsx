import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotFoundView } from "@/components/creators/state-views";
import { ManageView, type ManageApplicant } from "@/components/projects/manage-view";
import { projectsClosed } from "@/components/projects/sample-data";
import { STATUS_LABEL } from "@/components/projects/types";
import { isAdminUser } from "@/lib/admin-collab";
import { requireUser } from "@/lib/auth";
import { APPLICATION_LABEL, getPublicProject, listApplicants } from "@/lib/projects";
import { formatKst } from "@/lib/time";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "지원자 관리 · 프로젝트", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// 지원자 관리 화면. 운영자만 열린다(아니면 404). 처리(수락·거절·모집 마감)는 manage-view가 서버 동작을 불러 DB 함수로 한다.
export default async function ManagePage({ params }: Props) {
  if (projectsClosed()) notFound();
  const { id } = await params;
  await requireUser(`/projects/${id}/manage`);
  if (!(await isAdminUser())) notFound();
  const { project, failed } = await getPublicProject(id);
  if (failed) return <NotFoundView title="공고를 불러오지 못했어요" text="잠시 뒤에 다시 열어 주세요." href="/projects" label="프로젝트 목록 보기" />;
  if (!project) notFound();

  const rows = await listApplicants(project.id);
  const applicants: ManageApplicant[] = (rows ?? []).map((a) => ({
    id: a.id,
    status: a.status,
    statusLabel: APPLICATION_LABEL[a.status],
    name: a.name,
    motive: a.motive,
    offer: a.offeredReward === null ? null : `${a.offeredReward.toLocaleString("ko-KR")}만 원`,
    offerWon: a.offeredReward === null ? null : a.offeredReward * 10000, // 제안 보상(만 원) × 10000 = 원. 수락 입력 칸의 기본값
    period: a.availablePeriod,
    createdLabel: formatKst(a.createdAt),
    decidedLabel: a.decidedAt ? formatKst(a.decidedAt) : null,
    work: a.work,
  }));
  return <ManageView project={{ id: project.id, title: project.title, status: project.status, statusLabel: STATUS_LABEL[project.status] }} applicants={applicants} failed={rows === null} />;
}
