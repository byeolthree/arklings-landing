import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostForm } from "@/components/projects/post-form";
import { projectsClosed } from "@/components/projects/sample-data";
import { isAdminUser } from "@/lib/admin-collab";

export const metadata: Metadata = { title: "공고 올리기 · 프로젝트", robots: { index: false } };
export const dynamic = "force-dynamic"; // 운영자 여부를 열 때마다 새로 확인한다

// 공고 올리기 화면(예시). 운영자만 열리고(아니면 404), 올려도 저장하지 않는다. 실제 사이트(production)에서는 404다.
export default async function NewProjectPage() {
  if (projectsClosed()) notFound();
  if (!(await isAdminUser())) notFound();
  return <PostForm />;
}
