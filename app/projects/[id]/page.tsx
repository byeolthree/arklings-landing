import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { todayKst } from "@/components/projects/filter";
import { ProjectDetail } from "@/components/projects/project-detail";
import { getSampleProject, projectsClosed, SAMPLE_PROJECTS } from "@/components/projects/sample-data";
import { one } from "@/lib/utils";

export const dynamic = "force-dynamic"; // 마감까지 남은 날(D-day)을 열 때마다 새로 계산한다

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = projectsClosed() ? undefined : getSampleProject((await params).id);
  if (!p) return { title: "찾을 수 없는 프로젝트" };
  return { title: `${p.title} · 프로젝트`, description: p.summary, robots: { index: false } };
}

// 추천 프로젝트 3장: 지금 모집 중인 다른 공고 중 같은 역할을 먼저, 모자라면 나머지 모집 중 공고로 채운다.
function pickRelated(id: string) {
  const me = getSampleProject(id);
  const others = SAMPLE_PROJECTS.filter((p) => p.id !== id && p.status === "open");
  if (!me) return others.slice(0, 3);
  const same = others.filter((p) => p.roles.some((r) => me.roles.includes(r)));
  return [...same, ...others.filter((p) => !same.includes(p))].slice(0, 3);
}

export default async function ProjectPage({ params, searchParams }: Props) {
  if (projectsClosed()) notFound();
  const { id } = await params;
  const p = getSampleProject(id);
  if (!p) notFound();
  // 지원서(예시)를 보내고 돌아오면 ?applied=1이 붙는다. 모집 중인 공고에서만 인정한다(저장은 하지 않는다).
  const applied = one((await searchParams).applied) === "1" && p.status === "open";
  return <ProjectDetail p={p} related={pickRelated(id)} today={todayKst()} applied={applied} />;
}
