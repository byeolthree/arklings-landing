import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MyProjects } from "@/components/projects/my-projects";
import { projectsClosed } from "@/components/projects/sample-data";
import { isAdminUser } from "@/lib/admin-collab";
import { requireUser } from "@/lib/auth";
import { listMyPostedProjects } from "@/lib/projects";

export const metadata: Metadata = { title: "내 프로젝트", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// 내 프로젝트: 내가 올린 공고 목록. 운영자만 열린다(아니면 404). 삭제는 MyProjects가 deleteProject를 부른다.
export default async function MyProjectsPage() {
  if (projectsClosed()) notFound();
  const user = await requireUser("/projects/mine");
  if (!(await isAdminUser())) notFound();
  const projects = await listMyPostedProjects(user.id);
  return <MyProjects projects={projects} />;
}
