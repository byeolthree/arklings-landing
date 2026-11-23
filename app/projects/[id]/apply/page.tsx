import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplyForm } from "@/components/projects/apply-form";
import { getSampleProject, projectsClosed } from "@/components/projects/sample-data";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "지원서 쓰기 · 프로젝트", robots: { index: false } };

// 지원서 화면(예시). 모집 중인 공고만 열리고, 보내도 저장하지 않는다. 실제 사이트(production)에서는 404다.
export default async function ApplyPage({ params }: Props) {
  if (projectsClosed()) notFound();
  const p = getSampleProject((await params).id);
  if (!p || p.status !== "open") notFound();
  return <ApplyForm p={p} />;
}
