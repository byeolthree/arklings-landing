import type { Metadata } from "next";
import { MyApplications } from "@/components/projects/my-applications";
import { requireUser } from "@/lib/auth";
import { listMyApplications } from "@/lib/projects";

export const metadata: Metadata = { title: "마이페이지 · 내 지원 현황", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// 내 지원 현황. 읽기는 로그인한 본인의 권한(RLS)으로만 하고, 내 지원만 돌아온다.
export default async function MyApplicationsPage() {
  const user = await requireUser("/mypage/applications");
  return <MyApplications rows={await listMyApplications(user.id)} />;
}
