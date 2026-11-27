// 토스 결제 오류 코드 → 한국어 안내. 영어 오류 글은 화면에 그대로 내보내지 않는다.
const MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED: "결제를 취소했어요. 다시 결제하려면 계약 화면에서 「결제하기」를 눌러 주세요.",
  PAY_PROCESS_ABORTED: "결제가 중간에 멈췄어요. 다시 시도해 주세요.",
  REJECT_CARD_COMPANY: "카드사가 결제를 거절했어요. 다른 카드로 시도해 주세요.",
  INVALID_CARD_NUMBER: "카드 번호가 올바르지 않아요. 확인한 뒤 다시 시도해 주세요.",
  EXCEED_MAX_CARD_INSTALLMENT_PLAN: "할부 개월 수가 맞지 않아요. 다시 시도해 주세요.",
  NOT_AVAILABLE_PAYMENT: "지금은 쓸 수 없는 결제 방법이에요.",
  ALREADY_PROCESSED_PAYMENT: "이미 처리된 결제예요. 결제 내역을 확인해 주세요.",
  NOT_FOUND_PAYMENT_SESSION: "결제 시간이 지났어요. 계약 화면에서 다시 결제해 주세요.",
  AMOUNT_MISMATCH: "결제 금액이 계약 금액과 달라 승인하지 않았어요.",
  RESPONSE_MISMATCH: "결제 응답이 주문과 맞지 않아 기록하지 않았어요. 결제 내역을 확인해 주세요.",
  NOT_TEST_KEY: "테스트 결제 키가 아니라서 승인하지 않았어요.",
  NO_SECRET_KEY: "결제 설정이 아직 없어요. 계획 담당에게 알려 주세요.",
  TOSS_UNREACHABLE: "결제 서버에 연결하지 못했어요. 잠시 뒤에 다시 시도해 주세요.",
};

export function tossFailMessage(code: string): string {
  return MESSAGES[code] ?? "결제를 마치지 못했어요. 다시 시도해 주세요.";
}
