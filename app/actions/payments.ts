"use server";

import { revalidatePath } from "next/cache";
import { projectsClosed } from "@/components/projects/sample-data";
import { CONFIRM_FIRST_MESSAGE, getCurrentUser, isConfirmed } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-collab";
import { CONTRACT_MESSAGES, CONTRACT_UNAVAILABLE, contractMessage } from "@/lib/contracts";
import { createAuthClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/utils";

// 결제 주문 저장(0035 create_payment_order). 토스 결제창을 띄우기 전에 서버가 금액을 계약에서 읽어 저장한다(화면이 보낸 금액은 쓰지 않는다).
// 맨 위에서 로그인·이메일 확인·운영자를 다시 확인하고, 로그인한 본인의 권한(RLS)으로 DB 함수만 부른다.
export type OrderResult = { ok: true; orderId: string; amountWon: number } | { ok: false; message: string };

export async function createPaymentOrder(contractId: string): Promise<OrderResult> {
  if (projectsClosed()) return { ok: false, message: "이 기능은 아직 열려 있지 않아요." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: CONTRACT_MESSAGES.not_logged_in };
  if (!isConfirmed(user)) return { ok: false, message: CONFIRM_FIRST_MESSAGE };
  if (!(await isAdminUser())) return { ok: false, message: CONTRACT_MESSAGES.not_admin };
  if (!UUID_RE.test(contractId)) return { ok: false, message: CONTRACT_MESSAGES.contract_not_found };
  try {
    const { data, error } = await (await createAuthClient()).rpc("create_payment_order", { p_contract: contractId });
    if (error) return { ok: false, message: contractMessage(error) };
    const row = (Array.isArray(data) ? data[0] : data) as { order_id?: unknown; amount_won?: unknown } | null;
    if (!row || typeof row.order_id !== "string" || typeof row.amount_won !== "number") return { ok: false, message: CONTRACT_UNAVAILABLE };
    revalidatePath(`/contracts/${contractId}`);
    return { ok: true, orderId: row.order_id, amountWon: row.amount_won };
  } catch {
    return { ok: false, message: CONTRACT_UNAVAILABLE };
  }
}
