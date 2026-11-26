import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { todayKst } from "@/components/projects/filter";
import { ProjectDetail } from "@/components/projects/project-detail";
import { projectsClosed } from "@/components/projects/sample-data";
import { NotFoundView } from "@/components/creators/state-views";
import { isAdminUser } from "@/lib/admin-collab";
import { getCurrentUser } from "@/lib/auth";
import { getPublicProject, listPublicProjects, myApplicationStatus, myBookmarkIds } from "@/lib/projects";

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
  // 추천 3장: 모집 중인 다른 공고 중 같은 역할을 먼저, 모자라면 나머지 모집 중 공고로 채운다.
  const others = (all ?? []).filter((p) => p.id !== id && p.status === "open");
  const same = others.filter((p) => p.roles.some((r) => project.roles.includes(r)));
  const related = [...same, ...others.filter((p) => !same.includes(p))].slice(0, 3);

  return <ProjectDetail p={project} related={related} today={todayKst()} myStatus={myStatus} bookmarked={bookmarkedIds.includes(id)} bookmarkedIds={bookmarkedIds} loggedIn={user !== null} isAdmin={isAdmin} />;
}
