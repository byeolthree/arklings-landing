import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotFoundView } from "@/components/creators/state-views";
import { projectsClosed } from "@/components/projects/sample-data";
import { isAdminUser } from "@/lib/admin-collab";
import { requireUser } from "@/lib/auth";
import { contractMessage, getPaymentByOrder, won } from "@/lib/contracts";
import { createAuthClient } from "@/lib/supabase/server";
import { confirmTossPayment } from "@/lib/toss";
import { tossFailMessage } from "@/lib/toss-messages";

export const metadata: Metadata = { title: "결제 결과", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

// 토스가 결제 뒤에 돌려보내는 주소. 서버가 ① 운영자인지 ② 저장해 둔 주문 금액과 돌아온 금액이 같은지 확인하고 ③ 같을 때만(테스트 키일 때만) 토스 승인 API를 부른다.
// 성공하면 mark_payment_paid, 실패하면 mark_payment_failed를 부른다. 이미 승인된 주문은 승인 API를 다시 부르지 않는다(새로고침해도 안전).
// 토스에서는 승인되었는데 기록하지 못한 경우는 실패로 바꾸지 않고 주문번호와 함께 따로 안내한다.
export default async function PaymentSuccessPage({ searchParams }: Props) {
  if (projectsClosed()) notFound();
  const sp = await searchParams;
  const paymentKey = one(sp.paymentKey);
  const orderId = one(sp.orderId);
  const amountText = one(sp.amount);
  await requireUser("/mypage/payments");
  if (!(await isAdminUser())) notFound();

  const bad = !/^[A-Za-z0-9_-]{6,64}$/.test(orderId) || !/^[A-Za-z0-9_-]{1,200}$/.test(paymentKey) || !/^\d{1,10}$/.test(amountText);
  if (bad) return <NotFoundView title="결제 정보가 올바르지 않아요" text="결제 내역에서 상태를 확인해 주세요." href="/mypage/payments" label="결제 내역 보기" />;
  const amount = Number(amountText);

  const sb = await createAuthClient();
  const first = await getPaymentByOrder(orderId);
  if (first.failed) return <NotFoundView title="결제 결과를 확인하지 못했어요" text="잠시 뒤 결제 내역에서 확인해 주세요." href="/mypage/payments" label="결제 내역 보기" />;
  if (!first.payment) notFound();
  const payment = first.payment;
  const back = `/contracts/${payment.contractId}`;

  // 이미 승인된 주문(새로고침 등)은 다시 승인하지 않고 결과만 보여 준다.
  if (payment.status === "paid" || payment.status === "paid_out") {
    return <NotFoundView title="결제가 완료되었어요" text={`${won(payment.amountWon)}이 결제되어 보관 중이에요. 크리에이터가 작업을 시작해요.`} href={back} label="계약 보기" />;
  }
  if (payment.status !== "ready") {
    return <NotFoundView title="이미 처리된 결제 주문이에요" text="계약 화면에서 다시 결제를 시작할 수 있어요." href={back} label="계약으로 돌아가기" />;
  }

  // 저장 금액과 돌아온 금액이 다르면 승인하지 않는다.
  if (payment.amountWon !== amount) {
    await sb.rpc("mark_payment_failed", { p_order: orderId, p_code: "AMOUNT_MISMATCH" });
    return <NotFoundView title="결제 금액이 맞지 않아요" text="저장된 계약 금액과 달라 승인하지 않았어요. 계약 화면에서 다시 결제해 주세요." href={back} label="계약으로 돌아가기" />;
  }

  const confirmed = await confirmTossPayment({ paymentKey, orderId, amount });
  if (!confirmed.ok) {
    // 이미 처리된 결제를 다시 열었을 수 있으니 다시 읽어 확인한 뒤에만 실패로 기록한다.
    const again = await getPaymentByOrder(orderId);
    if (again.payment && (again.payment.status === "paid" || again.payment.status === "paid_out")) {
      return <NotFoundView title="결제가 완료되었어요" text={`${won(again.payment.amountWon)}이 결제되어 보관 중이에요.`} href={back} label="계약 보기" />;
    }
    await sb.rpc("mark_payment_failed", { p_order: orderId, p_code: confirmed.code });
    return <NotFoundView title="결제를 승인하지 못했어요" text={tossFailMessage(confirmed.code)} href={back} label="계약으로 돌아가기" />;
  }

  const { error } = await sb.rpc("mark_payment_paid", { p_order: orderId, p_payment_key: paymentKey, p_amount_won: amount });
  if (error) {
    return (
      <NotFoundView
        title="결제는 승인되었지만 기록하지 못했어요"
        text={`${contractMessage(error)} 주문번호 ${orderId}를 계획 담당에게 알려 주세요. 같은 주문은 다시 결제하지 마세요.`}
        href={back}
        label="계약으로 돌아가기"
      />
    );
  }
  return <NotFoundView title="결제가 완료되었어요" text={`${won(amount)}이 결제되어 보관 중이에요. 크리에이터에게 알림이 갔어요. (테스트 결제예요)`} href={back} label="계약 보기" />;
}
