"use server";

import { revalidatePath } from "next/cache";
import { projectsClosed } from "@/components/projects/sample-data";
import { CONFIRM_FIRST_MESSAGE, getCurrentUser, isConfirmed, type CurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-collab";
import { CONTRACT_MESSAGES, CONTRACT_UNAVAILABLE, contractMessage } from "@/lib/contracts";
import { createAuthClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/utils";

// 계약 처리(0035 함수). 모두 맨 위에서 로그인·이메일 확인을 다시 확인하고(운영자 동작은 운영자인지도), 로그인한 본인의 권한(RLS)으로 DB 함수만 부른다.
// 표에는 쓰지 않는다. 당사자 확인·상태 확인은 DB 함수가 한 번 더 한다. 실제 사이트(production)에서는 막는다.

const CLOSED_MESSAGE = "이 기능은 아직 열려 있지 않아요.";

export type ContractState = { ok?: boolean; message?: string; contractId?: string };

type Gate = { ok: true; user: CurrentUser } | { ok: false; message: string };
async function needUser(): Promise<Gate> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: CONTRACT_MESSAGES.not_logged_in };
  if (!isConfirmed(user)) return { ok: false, message: CONFIRM_FIRST_MESSAGE };
  return { ok: true, user };
}
async function needAdmin(): Promise<Gate> {
  const gate = await needUser();
  if (!gate.ok) return gate;
  if (!(await isAdminUser())) return { ok: false, message: CONTRACT_MESSAGES.not_admin };
  return gate;
}

function refresh(contractId: string) {
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/mypage/payments");
  revalidatePath("/mypage/applications");
  revalidatePath("/", "layout"); // 상단 종 아이콘 개수
}

// ── 운영자: 지원 수락 + 금액(원)·기간(일) 제시 ───────────────────────────────────────

export async function acceptWithOffer(_prev: ContractState, fd: FormData): Promise<ContractState> {
  if (projectsClosed()) return { message: CLOSED_MESSAGE };
  const gate = await needAdmin();
  if (!gate.ok) return { message: gate.message };
  const applicationId = String(fd.get("application_id") ?? "");
  const projectId = String(fd.get("project_id") ?? "");
  const amountText = String(fd.get("amount_won") ?? "").trim();
  const daysText = String(fd.get("days") ?? "").trim();
  if (!UUID_RE.test(applicationId) || !UUID_RE.test(projectId)) return { message: CONTRACT_MESSAGES.application_not_found };
  if (!/^\d{1,10}$/.test(amountText) || Number(amountText) < 10000 || Number(amountText) > 1_000_000_000) return { message: CONTRACT_MESSAGES.amount_invalid };
  if (!/^\d{1,3}$/.test(daysText) || Number(daysText) < 1 || Number(daysText) > 365) return { message: CONTRACT_MESSAGES.days_invalid };
  try {
    const { data, error } = await (await createAuthClient()).rpc("accept_with_offer", { p_application: applicationId, p_amount_won: Number(amountText), p_days: Number(daysText) });
    if (error) return { message: contractMessage(error) };
    const contractId = typeof data === "string" && UUID_RE.test(data) ? data : undefined;
    revalidatePath(`/projects/${projectId}/manage`);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    revalidatePath("/projects/mine");
    revalidatePath("/", "layout");
    return { ok: true, contractId, message: "수락하고 계약 금액을 제시했어요. 나머지 접수 지원은 자동으로 거절되었고 공고는 마감되었어요. 크리에이터의 동의를 기다려 주세요." };
  } catch {
    return { message: CONTRACT_UNAVAILABLE };
  }
}

// ── 계약 처리: 계약 번호 하나로 부르는 동작들 ───────────────────────────────────────

async function run(contractId: string, admin: boolean, call: (sb: Awaited<ReturnType<typeof createAuthClient>>) => PromiseLike<{ data: unknown; error: { message?: string } | null }>, okMessage: string): Promise<ContractState> {
  if (projectsClosed()) return { message: CLOSED_MESSAGE };
  const gate = admin ? await needAdmin() : await needUser();
  if (!gate.ok) return { message: gate.message };
  if (!UUID_RE.test(contractId)) return { message: CONTRACT_MESSAGES.contract_not_found };
  try {
    const { error } = await call(await createAuthClient());
    if (error) return { message: contractMessage(error) };
    refresh(contractId);
    return { ok: true, message: okMessage };
  } catch {
    return { message: CONTRACT_UNAVAILABLE };
  }
}

// 크리에이터: 제시 금액에 동의하거나 거부한다.
export async function respondOffer(contractId: string, agree: boolean): Promise<ContractState> {
  return run(contractId, false, (sb) => sb.rpc("respond_offer", { p_contract: contractId, p_agree: agree === true }), agree === true ? "동의했어요. 이제 계약서에 서명해 주세요." : "거부했어요. 공고는 다시 모집 중이 돼요.");
}

// 양측: 계약서에 서명한다(둘 다 서명하면 체결). 동의 체크 확인은 화면이 한다.
export async function signContract(contractId: string): Promise<ContractState> {
  return run(contractId, false, (sb) => sb.rpc("sign_contract", { p_contract: contractId }), "서명했어요.");
}

// 양측: 체결 전(금액 제시·서명 대기)에만 취소한다.
export async function cancelContract(contractId: string): Promise<ContractState> {
  return run(contractId, false, (sb) => sb.rpc("cancel_contract", { p_contract: contractId }), "계약을 취소했어요. 공고는 다시 모집 중이 돼요.");
}

// 크리에이터: 결제된 계약을 납품한다.
export async function requestDelivery(contractId: string): Promise<ContractState> {
  return run(contractId, false, (sb) => sb.rpc("request_delivery", { p_contract: contractId }), "납품했어요. 운영자의 정산을 기다려 주세요.");
}

// 운영자: 납품을 확인하고 정산한다(수수료·정산액을 기록하고 계약을 끝낸다. 실제 이체는 없다).
export async function approveCompletion(contractId: string): Promise<ContractState> {
  return run(contractId, true, (sb) => sb.rpc("approve_completion", { p_contract: contractId }), "정산을 기록했어요. 계약이 끝났어요.");
}
