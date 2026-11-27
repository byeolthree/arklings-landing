// 계약·결제의 이름표·금액 계산·오류 안내(서버 전용 코드가 없어서 화면 부품도 가져다 쓴다). 읽기 함수는 lib/contracts.ts에 있다.
export type ContractStatus = "offered" | "declined" | "signing" | "active" | "cancelled" | "completed";
export type PaymentStatus = "ready" | "paid" | "paid_out" | "failed";

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  offered: "금액 제시",
  declined: "거부됨",
  signing: "서명 대기",
  active: "체결",
  cancelled: "취소됨",
  completed: "완료",
};
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  ready: "결제 대기",
  paid: "결제 완료(보관 중)",
  paid_out: "정산 기록됨",
  failed: "결제 실패",
};

// 수수료 = 금액 ÷ 10 몫(1원 단위 버림), 정산액 = 금액 − 수수료. DB 함수(approve_completion)와 같은 계산이다.
export const feeOf = (amountWon: number) => Math.floor(amountWon / 10);
export const payoutOf = (amountWon: number) => amountWon - feeOf(amountWon);
export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

// DB 함수가 돌려주는 글자 코드 → 한국어 안내(0035)
export const CONTRACT_MESSAGES: Record<string, string> = {
  not_logged_in: "로그인이 풀렸어요. 다시 로그인한 뒤 시도해 주세요.",
  not_admin: "운영자만 할 수 있어요.",
  amount_invalid: "금액은 1만 원 이상 10억 원 이하의 정수(원)로 적어 주세요.",
  days_invalid: "기간은 1일 이상 365일 이하의 정수로 적어 주세요.",
  application_not_found: "찾을 수 없는 지원이에요.",
  already_decided: "이미 처리된 지원이에요. 화면을 새로 고쳐 확인해 주세요.",
  already_closed: "이미 모집이 마감된 공고예요.",
  contract_not_found: "찾을 수 없는 계약이에요.",
  contract_not_offered: "이미 처리된 금액 제시예요. 화면을 새로 고쳐 확인해 주세요.",
  contract_not_signing: "지금은 서명할 수 없는 계약이에요. 화면을 새로 고쳐 확인해 주세요.",
  already_signed: "이미 서명했어요.",
  contract_not_cancellable: "체결된 계약은 취소할 수 없어요.",
  contract_not_active: "체결된 계약만 결제하거나 완료할 수 있어요.",
  already_paid: "이미 결제된 계약이에요.",
  order_not_found: "찾을 수 없는 결제 주문이에요.",
  order_not_ready: "이미 처리된 결제 주문이에요.",
  amount_mismatch: "결제 금액이 계약 금액과 달라요.",
  payment_key_invalid: "결제 정보가 올바르지 않아요.",
  delivery_not_allowed: "결제가 끝난 계약에서만 납품할 수 있어요. 이미 납품했다면 운영자의 정산을 기다려 주세요.",
  completion_not_allowed: "납품이 있는 결제 완료 계약만 정산할 수 있어요.",
};
export const CONTRACT_UNAVAILABLE = "지금은 처리할 수 없어요. 잠시 뒤에 다시 시도해 주세요.";

export function contractMessage(error: { message?: string } | null): string {
  const text = error?.message ?? "";
  for (const [code, message] of Object.entries(CONTRACT_MESSAGES)) if (text.includes(code)) return message;
  return CONTRACT_UNAVAILABLE;
}
