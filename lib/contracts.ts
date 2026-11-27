import type { ContractStatus, PaymentStatus } from "@/lib/contract-labels";
import { createAuthClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/utils";

// 계약·결제(0035) 읽기. 모두 로그인한 본인의 권한(RLS)으로 읽고, 서버 전용 열쇠는 쓰지 않는다. 쓰기는 app/actions/contracts.ts·payments.ts가 0035 함수로만 한다.
// 읽지 못하면 null을 돌려 주고, 화면은 오류 안내만 보여 준다. 금액 단위는 원이다.

export {
  CONTRACT_MESSAGES,
  CONTRACT_STATUS_LABEL,
  CONTRACT_UNAVAILABLE,
  PAYMENT_STATUS_LABEL,
  contractMessage,
  feeOf,
  payoutOf,
  won,
  type ContractStatus,
  type PaymentStatus,
} from "@/lib/contract-labels";

type ContractRow = {
  id: string;
  project_id: string;
  application_id: string;
  admin_id: string | null;
  creator_id: string;
  amount_won: number;
  days: number;
  status: ContractStatus;
  starts_on: string | null;
  ends_on: string | null;
  responded_at: string | null;
  admin_signed_at: string | null;
  creator_signed_at: string | null;
  closed_at: string | null;
  created_at: string;
  projects: { title: string } | null;
};
type PaymentRow = {
  id: string;
  contract_id: string;
  order_id: string;
  amount_won: number;
  status: PaymentStatus;
  approved_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  fee_won: number | null;
  payout_won: number | null;
  created_at: string;
};

export type Contract = {
  id: string;
  projectId: string;
  projectTitle: string; // 내려간 공고면 빈 글자
  applicationId: string;
  adminId: string | null;
  creatorId: string;
  adminName: string;
  creatorName: string;
  amountWon: number;
  days: number;
  status: ContractStatus;
  startsOn: string | null;
  endsOn: string | null;
  adminSignedAt: string | null;
  creatorSignedAt: string | null;
  createdAt: string;
};
export type Payment = {
  id: string;
  contractId: string;
  orderId: string;
  amountWon: number;
  status: PaymentStatus;
  approvedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  feeWon: number | null;
  payoutWon: number | null;
};

const CONTRACT_COLS =
  "id, project_id, application_id, admin_id, creator_id, amount_won, days, status, starts_on, ends_on, responded_at, admin_signed_at, creator_signed_at, closed_at, created_at, projects(title)";
const PAYMENT_COLS = "id, contract_id, order_id, amount_won, status, approved_at, delivered_at, completed_at, fee_won, payout_won, created_at";

const toPayment = (p: PaymentRow): Payment => ({
  id: p.id,
  contractId: p.contract_id,
  orderId: p.order_id,
  amountWon: p.amount_won,
  status: p.status,
  approvedAt: p.approved_at,
  deliveredAt: p.delivered_at,
  completedAt: p.completed_at,
  feeWon: p.fee_won,
  payoutWon: p.payout_won,
});

// 계약 한 건과 그 결제. 없는 번호·형식이 틀린 번호·내 것이 아닌 계약은 contract가 null이고 failed는 false다. 못 읽으면 failed가 true다.
export async function getContract(id: string): Promise<{ contract: Contract | null; payment: Payment | null; failed: boolean }> {
  if (!UUID_RE.test(id)) return { contract: null, payment: null, failed: false };
  try {
    const sb = await createAuthClient();
    const { data, error } = await sb.from("contracts").select(CONTRACT_COLS).eq("id", id).maybeSingle();
    if (error) return { contract: null, payment: null, failed: true };
    if (!data) return { contract: null, payment: null, failed: false };
    const c = data as unknown as ContractRow;
    const ids = [c.admin_id, c.creator_id].filter((v): v is string => Boolean(v));
    const [names, pay] = await Promise.all([
      sb.from("profiles").select("id, display_name").in("id", ids),
      sb.from("payments").select(PAYMENT_COLS).eq("contract_id", id).maybeSingle(),
    ]);
    if (pay.error) return { contract: null, payment: null, failed: true };
    const nameOf = new Map(((names.data ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name ?? ""]));
    return {
      contract: {
        id: c.id,
        projectId: c.project_id,
        projectTitle: c.projects?.title ?? "",
        applicationId: c.application_id,
        adminId: c.admin_id,
        creatorId: c.creator_id,
        adminName: (c.admin_id && nameOf.get(c.admin_id)) || "이름 없음",
        creatorName: nameOf.get(c.creator_id) || "이름 없음",
        amountWon: c.amount_won,
        days: c.days,
        status: c.status,
        startsOn: c.starts_on,
        endsOn: c.ends_on,
        adminSignedAt: c.admin_signed_at,
        creatorSignedAt: c.creator_signed_at,
        createdAt: c.created_at,
      },
      payment: pay.data ? toPayment(pay.data as unknown as PaymentRow) : null,
      failed: false,
    };
  } catch {
    return { contract: null, payment: null, failed: true };
  }
}

// 결제 주문 한 건(주문번호로). 결제 성공 화면이 저장된 금액을 읽을 때 쓴다. 못 읽으면 failed가 true다.
export async function getPaymentByOrder(orderId: string): Promise<{ payment: Payment | null; failed: boolean }> {
  try {
    const { data, error } = await (await createAuthClient()).from("payments").select(PAYMENT_COLS).eq("order_id", orderId).maybeSingle();
    if (error) return { payment: null, failed: true };
    return { payment: data ? toPayment(data as unknown as PaymentRow) : null, failed: false };
  } catch {
    return { payment: null, failed: true };
  }
}

export type PaymentListRow = Payment & { projectTitle: string; contractStatus: ContractStatus };

// 결제 내역. 운영자는 결제한 것(paid·paid_out), 크리에이터는 자기 계약의 결제·정산(ready·paid·paid_out)을 읽는다. RLS가 당사자 것만 돌려준다. 못 읽으면 null.
export async function listPaymentHistory(isAdmin: boolean): Promise<PaymentListRow[] | null> {
  try {
    const { data, error } = await (await createAuthClient())
      .from("payments")
      .select(`${PAYMENT_COLS}, contracts(status, projects(title))`)
      .in("status", isAdmin ? ["paid", "paid_out"] : ["ready", "paid", "paid_out"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return null;
    return ((data ?? []) as unknown as (PaymentRow & { contracts: { status: ContractStatus; projects: { title: string } | null } | null })[]).map((r) => ({
      ...toPayment(r),
      projectTitle: r.contracts?.projects?.title ?? "",
      contractStatus: r.contracts?.status ?? "active",
    }));
  } catch {
    return null;
  }
}

// 내 지원에 붙은 계약(내 지원 현황의 「계약 보기」). 못 읽으면 빈 목록이다(링크만 안 보인다).
export async function listMyContractsByApplication(applicationIds: string[]): Promise<Map<string, { id: string; status: ContractStatus }>> {
  const out = new Map<string, { id: string; status: ContractStatus }>();
  if (applicationIds.length === 0) return out;
  try {
    const { data } = await (await createAuthClient()).from("contracts").select("id, application_id, status").in("application_id", applicationIds);
    for (const r of (data ?? []) as { id: string; application_id: string; status: ContractStatus }[]) out.set(r.application_id, { id: r.id, status: r.status });
  } catch {
    // 링크만 안 보인다
  }
  return out;
}
