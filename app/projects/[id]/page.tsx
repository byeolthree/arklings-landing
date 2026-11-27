import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { todayKst } from "@/components/projects/filter";
import { ProjectDetail } from "@/components/projects/project-detail";
import { projectsClosed } from "@/components/projects/sample-data";
import { NotFoundView } from "@/components/creators/state-views";
import { isAdminUser } from "@/lib/admin-collab";
import { getCurrentUser } from "@/lib/auth";
import { getPublicProject, listPublicProjects, myApplicationStatus, myBookmarkIds, pickSimilarProjects } from "@/lib/projects";

export const dynamic = "force-dynamic"; // 마감까지 남은 날(D-day)·지원자 수·내 지원 상태를 열 때마다 새로 읽는다

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (projectsClosed()) return { title: "찾을 수 없는 프로젝트" };
  const { project } = await getPublicProject((await params).id);
  if (!project) return { title: "찾을 수 없는 프로젝트" };
  return { title: `${project.title} · 프로젝트`, description: project.summary, robots: { index: false } };
}

export default async function ProjectPage({ params }: Props) {
  if (projectsClosed()) notFound();
  const { id } = await params;
  const { project, failed } = await getPublicProject(id);
  if (failed) {
    return <NotFoundView title="공고를 불러오지 못했어요" text="잠시 뒤에 다시 열어 주세요." href="/projects" label="프로젝트 목록 보기" />;
  }
  if (!project) notFound();

  const user = await getCurrentUser();
  const [all, myStatus, bookmarkedIds, isAdmin] = await Promise.all([
    listPublicProjects(),
    user ? myApplicationStatus(id, user.id) : Promise.resolve(null),
    user ? myBookmarkIds(user.id) : Promise.resolve([]),
    user ? isAdminUser() : Promise.resolve(false),
  ]);
  // 「비슷한 프로젝트」 최대 3장: 모집 중인 다른 공고 중 역할·장르가 겹치는 것을 먼저(겹치는 개수 많은 순, 같으면 최신순), 모자라면 최신 모집 중 공고로 채운다.
  const related = pickSimilarProjects(project, all ?? []);
  return <ProjectDetail p={project} related={related} today={todayKst()} myStatus={myStatus} bookmarked={bookmarkedIds.includes(id)} bookmarkedIds={bookmarkedIds} loggedIn={user !== null} isAdmin={isAdmin} />;
}
