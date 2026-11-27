import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaymentList } from "@/components/contracts/payment-list";
import { projectsClosed } from "@/components/projects/sample-data";
import { isAdminUser } from "@/lib/admin-collab";
import { requireUser } from "@/lib/auth";
import { listPaymentHistory } from "@/lib/contracts";

export const metadata: Metadata = { title: "마이페이지 · 결제 내역", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// 결제 내역. 읽기는 로그인한 본인의 권한(RLS)으로만 한다. 운영자는 결제한 것, 크리에이터는 자기 계약의 결제·정산 상태가 돌아온다.
export default async function MyPaymentsPage() {
  if (projectsClosed()) notFound();
  await requireUser("/mypage/payments");
  const isAdmin = await isAdminUser();
  return <PaymentList rows={await listPaymentHistory(isAdmin)} isAdmin={isAdmin} />;
}
