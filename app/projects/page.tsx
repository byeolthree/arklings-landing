import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { applyFilter, parseFilter, PROJECT_PAGE_SIZE, todayKst } from "@/components/projects/filter";
import { ProjectList } from "@/components/projects/project-list";
import { projectsClosed, SAMPLE_PROJECTS } from "@/components/projects/sample-data";
import { isAdminUser } from "@/lib/admin-collab";
import { one } from "@/lib/utils";

export const metadata: Metadata = { title: "프로젝트 모집", description: "아클링스가 진행하는 프로젝트에 지원해 보세요.", robots: { index: false } };
export const dynamic = "force-dynamic"; // 마감까지 남은 날(D-day)과 운영자 여부를 열 때마다 새로 계산한다

type SP = Promise<Record<string, string | string[] | undefined>>;

// 이번 단계는 화면만이라 예시 데이터를 읽는다. 실제 사이트(production)에서는 404다.
export default async function ProjectsPage({ searchParams }: { searchParams: SP }) {
  if (projectsClosed()) notFound();
  const sp = await searchParams;
  const requested = Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1);
  const filter = parseFilter({ q: one(sp.q), role: one(sp.role), status: one(sp.status), reward: one(sp.reward), sort: one(sp.sort) });
  const all = applyFilter([...SAMPLE_PROJECTS], filter);
  const pages = Math.max(1, Math.ceil(all.length / PROJECT_PAGE_SIZE));
  const items = all.slice((requested - 1) * PROJECT_PAGE_SIZE, requested * PROJECT_PAGE_SIZE);
  const isAdmin = await isAdminUser();
  // 공고 올리기(예시)에서 돌아왔을 때만 안내를 띄운다(저장은 하지 않는다)
  const postedTitle = one(sp.posted) === "1" ? (one(sp.title) ?? "").replace(/\s+/g, " ").trim().slice(0, 60) : undefined;
  return <ProjectList items={items} total={all.length} page={requested} pages={pages} filter={filter} today={todayKst()} isAdmin={isAdmin} postedTitle={postedTitle} />;
}
