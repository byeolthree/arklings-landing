"use client";

import { useState, useTransition } from "react";
import { createPaymentOrder } from "@/app/actions/payments";

// 토스페이먼츠 v2 결제창(새 패키지 없이 공식 스크립트를 불러 쓴다). 순서: 서버가 주문(금액은 계약에서 읽은 값)을 저장 → 결제창 → 성공·실패 주소로 돌아옴.
// 고객 식별은 익명 값이라 이메일·사용자 번호를 토스에 보내지 않는다. 승인은 돌아온 주소(/payments/success)에서 서버가 한다.
type TossPayment = {
  requestPayment: (o: { method: string; amount: { currency: string; value: number }; orderId: string; orderName: string; successUrl: string; failUrl: string }) => Promise<void>;
};
type TossFactory = ((clientKey: string) => { payment: (o: { customerKey: string }) => TossPayment }) & { ANONYMOUS: string };
declare global {
  interface Window {
    TossPayments?: TossFactory;
  }
}

const SDK = "https://js.tosspayments.com/v2/standard";

function loadSdk(): Promise<TossFactory> {
  return new Promise((resolve, reject) => {
    if (window.TossPayments) return resolve(window.TossPayments);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK}"]`);
    const script = existing ?? Object.assign(document.createElement("script"), { src: SDK, async: true });
    script.addEventListener("load", () => (window.TossPayments ? resolve(window.TossPayments) : reject(new Error("sdk"))), { once: true });
    script.addEventListener("error", () => reject(new Error("sdk")), { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

export function PayButton({ contractId, orderName, clientKey }: { contractId: string; orderName: string; clientKey: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pay = () => {
    setMessage(null);
    if (!clientKey) {
      setMessage("결제 설정이 아직 없어요. 잠시 뒤에 다시 시도해 주세요.");
      return;
    }
    startTransition(async () => {
      const order = await createPaymentOrder(contractId);
      if (!order.ok) {
        setMessage(order.message);
        return;
      }
      try {
        const toss = await loadSdk();
        const payment = toss(clientKey).payment({ customerKey: toss.ANONYMOUS });
        await payment.requestPayment({
          method: "CARD",
          amount: { currency: "KRW", value: order.amountWon },
          orderId: order.orderId,
          orderName: orderName.slice(0, 100) || "아클링스 프로젝트",
          successUrl: `${window.location.origin}/payments/success`,
          failUrl: `${window.location.origin}/payments/fail`,
        });
      } catch (e) {
        const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
        setMessage(code === "USER_CANCEL" ? "결제를 취소했어요. 다시 누르면 새로 시작해요." : "결제창을 열지 못했어요. 잠시 뒤에 다시 시도해 주세요.");
      }
    });
  };

  return (
    <div className="ct-pay">
      <button type="button" className="btn btn-primary" onClick={pay} disabled={pending} aria-busy={pending}>
        {pending ? "결제 준비 중…" : "결제하기"}
      </button>
      {message && (
        <p className="pj-error" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
