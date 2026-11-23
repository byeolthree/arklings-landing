import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { todayKst } from "@/components/projects/filter";
import { getSampleProject, getSampleWork, projectsClosed, projectsOfWork } from "@/components/projects/sample-data";
import { WorkView } from "@/components/projects/work-view";
import { one } from "@/lib/utils";

export const dynamic = "force-dynamic"; // 마감까지 남은 날(D-day)을 열 때마다 새로 계산한다

type Props = { params: Promise<{ workId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const w = projectsClosed() ? undefined : getSampleWork((await params).workId);
  return w ? { title: `${w.title} · 작품`, robots: { index: false } } : { title: "찾을 수 없는 작품" };
}

// 작품 화면(예시). 공고 상세의 「작품 보기」가 온다. 실제 사이트(production)에서는 404다.
export default async function WorkPage({ params, searchParams }: Props) {
  if (projectsClosed()) notFound();
  const w = getSampleWork((await params).workId);
  if (!w) notFound();
  const from = one((await searchParams).from);
  const fromId = from && getSampleProject(from) ? from : undefined; // 없는 번호는 무시한다
  return <WorkView work={w} projects={projectsOfWork(w.id)} today={todayKst()} fromId={fromId} />;
}
