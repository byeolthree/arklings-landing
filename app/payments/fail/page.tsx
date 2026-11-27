import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotFoundView } from "@/components/creators/state-views";
import { projectsClosed } from "@/components/projects/sample-data";
import { isAdminUser } from "@/lib/admin-collab";
import { requireUser } from "@/lib/auth";
import { getPaymentByOrder } from "@/lib/contracts";
import { createAuthClient } from "@/lib/supabase/server";
import { tossFailMessage } from "@/lib/toss-messages";

export const metadata: Metadata = { title: "결제 실패", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

// 토스가 결제 실패·취소 때 돌려보내는 주소. 운영자만 열리고, 주문번호가 올바르면 mark_payment_failed로 그 주문을 실패로 적는다(DB 함수는 아직 결제 대기인 주문만 바꾼다).
// 토스가 준 영어 글(message)은 화면에 내보내지 않고, 코드를 한국어 안내로 바꿔 보인다.
export default async function PaymentFailPage({ searchParams }: Props) {
  if (projectsClosed()) notFound();
  const sp = await searchParams;
  const code = one(sp.code).replace(/[^A-Za-z0-9_]/g, "").slice(0, 60);
  const orderId = one(sp.orderId);
  await requireUser("/mypage/payments");
  if (!(await isAdminUser())) notFound();

  let back = "/mypage/payments";
  let label = "결제 내역 보기";
  if (/^[A-Za-z0-9_-]{6,64}$/.test(orderId)) {
    const found = await getPaymentByOrder(orderId);
    if (found.payment) {
      back = `/contracts/${found.payment.contractId}`;
      label = "계약으로 돌아가기";
      await (await createAuthClient()).rpc("mark_payment_failed", { p_order: orderId, p_code: code || "UNKNOWN" });
    }
  }
  return <NotFoundView title="결제가 끝나지 않았어요" text={tossFailMessage(code)} href={back} label={label} />;
}
