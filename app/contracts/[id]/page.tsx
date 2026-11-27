import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContractView } from "@/components/contracts/contract-view";
import { NotFoundView } from "@/components/creators/state-views";
import { projectsClosed } from "@/components/projects/sample-data";
import { isAdminUser } from "@/lib/admin-collab";
import { requireUser } from "@/lib/auth";
import { getContract } from "@/lib/contracts";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "계약", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// 계약 화면. 계약 당사자(크리에이터 본인 또는 운영자)만 열린다(아니면 404). 처리는 contract-view가 서버 동작을 불러 DB 함수로 한다.
// 토스 클라이언트 키는 운영자가 결제할 수 있을 때만 서버가 읽어 넘긴다(비밀 키는 이 화면에 오지 않는다).
export default async function ContractPage({ params }: Props) {
  if (projectsClosed()) notFound();
  const { id } = await params;
  const user = await requireUser(`/contracts/${id}`);
  const { contract, payment, failed } = await getContract(id);
  if (failed) return <NotFoundView title="계약을 불러오지 못했어요" text="잠시 뒤에 다시 열어 주세요." href="/mypage/applications" label="내 지원 현황 보기" />;
  if (!contract) notFound();

  const isCreator = contract.creatorId === user.id;
  const isAdmin = !isCreator && (await isAdminUser());
  if (!isCreator && !isAdmin) notFound();

  const canPay = isAdmin && contract.status === "active" && (!payment || payment.status === "ready" || payment.status === "failed");
  const clientKey = canPay ? (process.env.NEXT_TOSS_CLIENT_KEY ?? "") : "";
  return <ContractView contract={contract} payment={payment} role={isCreator ? "creator" : "admin"} tossClientKey={clientKey} />;
}
