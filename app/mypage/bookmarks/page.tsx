import type { Metadata } from "next";
import { todayKst } from "@/components/projects/filter";
import { MyBookmarks } from "@/components/projects/my-bookmarks";
import { requireUser } from "@/lib/auth";
import { listMyBookmarkedProjects } from "@/lib/projects";

export const metadata: Metadata = { title: "마이페이지 · 내 북마크", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// 내 북마크. 읽기는 로그인한 본인의 권한(RLS)으로만 하고, 내 북마크만 돌아온다.
export default async function MyBookmarksPage() {
  const user = await requireUser("/mypage/bookmarks");
  return <MyBookmarks projects={await listMyBookmarkedProjects(user.id)} today={todayKst()} />;
}
