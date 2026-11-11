import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAdminUser } from "@/lib/admin-collab";
import { requireUser } from "@/lib/auth";
import { MEASURE_ENABLED, UsageView, loadUsage, parseUsageQuery } from "@/lib/measure/server";

export const metadata: Metadata = { title: "운영자 · 사용 기록", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic"; // 로그인·운영자 확인과 최신 기록을 요청 때마다 확인한다

type SP = Promise<Record<string, string | string[] | undefined>>;

// 사용 기록 화면. 코드는 lib/measure/ 안에 있고 이 파일은 확인만 한다(측정 도구를 끄면 404, 들어낼 때는 이 파일도 지운다).
export default async function AdminUsagePage({ searchParams }: { searchParams: SP }) {
  if (!MEASURE_ENABLED) notFound();
  await requireUser("/admin/usage");
  // 운영자 표시가 없는 계정에는 이 화면이 있다는 것도 알리지 않는다.
  if (!(await isAdminUser())) notFound();
  const q = parseUsageQuery(await searchParams);
  return <UsageView q={q} load={await loadUsage(q)} />;
}
