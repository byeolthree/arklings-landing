// 토스페이먼츠 결제 승인(서버 전용). 비밀 키는 환경 변수 TOSS_SECRET_KEY에서만 읽고 화면·로그에 내보내지 않는다.
// 테스트 키(test_로 시작)일 때만 호출한다. 실제 결제 키가 들어 있으면 호출하지 않고 막는다.
export type TossConfirm = { ok: true } | { ok: false; code: string };

export async function confirmTossPayment(input: { paymentKey: string; orderId: string; amount: number }): Promise<TossConfirm> {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) return { ok: false, code: "NO_SECRET_KEY" };
  if (!secret.startsWith("test_")) return { ok: false, code: "NOT_TEST_KEY" };
  try {
    const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as { code?: unknown; status?: unknown; orderId?: unknown; totalAmount?: unknown } | null;
    if (!res.ok) return { ok: false, code: typeof body?.code === "string" ? body.code.replace(/[^A-Za-z0-9_]/g, "").slice(0, 60) || "TOSS_ERROR" : "TOSS_ERROR" };
    // 승인 응답이 우리가 보낸 주문·금액과 같은지 한 번 더 본다.
    if (!body || body.status !== "DONE" || body.orderId !== input.orderId || body.totalAmount !== input.amount) return { ok: false, code: "RESPONSE_MISMATCH" };
    return { ok: true };
  } catch {
    return { ok: false, code: "TOSS_UNREACHABLE" };
  }
}
