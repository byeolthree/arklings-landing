import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseFilter, PROJECT_PAGE_SIZE, todayKst } from "@/components/projects/filter";
import { ProjectList } from "@/components/projects/project-list";
import { projectsClosed } from "@/components/projects/sample-data";
import { isAdminUser } from "@/lib/admin-collab";
import { getCurrentUser } from "@/lib/auth";
import { applyProjectFilter, listPublicProjects, myBookmarkIds } from "@/lib/projects";
import { one } from "@/lib/utils";

export const metadata: Metadata = { title: "프로젝트 모집", description: "아클링스가 진행하는 프로젝트에 지원해 보세요.", robots: { index: false } };
export const dynamic = "force-dynamic"; // 마감까지 남은 날(D-day)·지원자 수·내 북마크를 열 때마다 새로 읽는다

type SP = Promise<Record<string, string | string[] | undefined>>;

// 공고는 DB 보기 projects_public에서 읽는다. 실제 사이트(production)에서는 이 화면이 404인 지금 규칙을 그대로 둔다.
export default async function ProjectsPage({ searchParams }: { searchParams: SP }) {
  if (projectsClosed()) notFound();
  const sp = await searchParams;
  const requested = Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1);
  const filter = parseFilter({ q: one(sp.q), role: one(sp.role), status: one(sp.status), reward: one(sp.reward), sort: one(sp.sort) });
  const user = await getCurrentUser();
  const [all, isAdmin, bookmarkedIds] = await Promise.all([listPublicProjects(), user ? isAdminUser() : Promise.resolve(false), user ? myBookmarkIds(user.id) : Promise.resolve([])]);
  const list = all === null ? [] : applyProjectFilter(all, filter);
  const pages = Math.max(1, Math.ceil(list.length / PROJECT_PAGE_SIZE));
  const items = list.slice((requested - 1) * PROJECT_PAGE_SIZE, requested * PROJECT_PAGE_SIZE);
  return (
    <ProjectList items={items} total={list.length} page={requested} pages={pages} filter={filter} today={todayKst()} isAdmin={isAdmin} loggedIn={user !== null} bookmarkedIds={bookmarkedIds} failed={all === null} />
  );
}
