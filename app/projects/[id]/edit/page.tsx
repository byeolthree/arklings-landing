import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotFoundView } from "@/components/creators/state-views";
import { PostForm } from "@/components/projects/post-form";
import { projectsClosed } from "@/components/projects/sample-data";
import { isAdminUser } from "@/lib/admin-collab";
import { requireUser } from "@/lib/auth";
import { getPublicProject, listSourceWorks } from "@/lib/projects";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "공고 수정 · 프로젝트", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic"; // 운영자 여부·지원자 수를 열 때마다 새로 확인한다

// 공고 수정 화면. 운영자만 열린다(아니면 404). 마감된 공고는 안내만 보인다. 저장은 updateProject가 하고, 서버가 다시 한 번 막는다.
export default async function EditProjectPage({ params }: Props) {
  if (projectsClosed()) notFound();
  const { id } = await params;
  await requireUser(`/projects/${id}/edit`);
  if (!(await isAdminUser())) notFound();
  const { project, failed } = await getPublicProject(id);
  if (failed) return <NotFoundView title="공고를 불러오지 못했어요" text="잠시 뒤에 다시 열어 주세요." href="/projects/mine" label="내 프로젝트 보기" />;
  if (!project) notFound();
  if (project.status === "closed") {
    return <NotFoundView title="마감된 공고는 수정할 수 없어요" text="모집이 끝난 공고는 내용을 바꿀 수 없어요." href={`/projects/${project.id}`} label="공고로 돌아가기" />;
  }
  const values: Record<string, string | string[]> = {
    title: project.title,
    summary: project.summary,
    description: project.description,
    roles: project.roles,
    genres: project.genres,
    reward_min: project.negotiable ? "" : String(project.rewardMin),
    reward_max: project.negotiable ? "" : String(project.rewardMax),
    opens_on: project.opensAt,
    deadline_on: project.deadline,
    work_starts_on: project.workStartsOn ?? "",
    work_ends_on: project.workEndsOn ?? "",
    source: project.source,
    source_work_id: project.work.id,
  };
  return <PostForm sourceWorks={await listSourceWorks()} edit={{ projectId: project.id, values, lockedFields: project.applicants >= 1 }} />;
}
