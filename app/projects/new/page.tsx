import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostForm } from "@/components/projects/post-form";
import { projectsClosed } from "@/components/projects/sample-data";
import { isAdminUser } from "@/lib/admin-collab";
import { requireUser } from "@/lib/auth";
import { listSourceWorks } from "@/lib/projects";

export const metadata: Metadata = { title: "공고 올리기 · 프로젝트", robots: { index: false } };
export const dynamic = "force-dynamic"; // 운영자 여부를 열 때마다 새로 확인한다

// 공고 올리기 화면. 운영자만 열린다(아니면 404). 저장은 createProject가 projects 표에 한다.
export default async function NewProjectPage() {
  if (projectsClosed()) notFound();
  await requireUser("/projects/new");
  if (!(await isAdminUser())) notFound();
  return <PostForm sourceWorks={await listSourceWorks()} />;
}
