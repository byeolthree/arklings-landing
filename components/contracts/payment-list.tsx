import Link from "next/link";
import { CONTRACT_STATUS_LABEL, PAYMENT_STATUS_LABEL, won, type PaymentListRow } from "@/lib/contracts";
import { formatKst } from "@/lib/time";
import "../creators/creators.css";
import "../projects/projects.css";

// 결제 내역(/mypage/payments). 읽기만 한다. 운영자는 결제한 것, 크리에이터는 자기 계약의 결제·정산 상태를 본다(RLS가 당사자 것만 돌려준다).
export function PaymentList({ rows, isAdmin }: { rows: PaymentListRow[] | null; isAdmin: boolean }) {
  return (
    <div className="cr pj">
      <section className="cr-top">
        <div className="wrap">
          <h1 className="cr-title">결제 내역</h1>
          <p className="cr-desc">{isAdmin ? "결제한 프로젝트 대금을 확인하세요(테스트 결제예요)." : "내 계약의 결제와 정산 상태를 확인하세요."}</p>
        </div>
      </section>
      <section className="cr-list">
        <div className="wrap pj-formwrap pj-listwrap">
          {rows === null ? (
            <div className="panel cr-state" role="alert">
              <h2>결제 내역을 불러오지 못했어요</h2>
              <p>잠시 뒤에 다시 열어 주세요.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="panel cr-state">
              <h2>아직 결제 내역이 없어요</h2>
              <p>{isAdmin ? "계약이 체결되면 계약 화면에서 결제할 수 있어요." : "계약이 체결되고 결제가 되면 여기에 보여요."}</p>
            </div>
          ) : (
            <ul className="pj-rows">
              {rows.map((r) => (
                <li key={r.id} className="panel pj-row ct-row">
                  <div className="pj-row-main">
                    <Link href={`/contracts/${r.contractId}`} className="pj-row-title">
                      {r.projectTitle || "내려간 공고예요"}
                    </Link>
                    <span className="pj-row-sub">
                      {won(r.amountWon)}
                      {r.status === "paid_out" && r.feeWon !== null && r.payoutWon !== null ? ` · 수수료 ${won(r.feeWon)} · 정산액 ${won(r.payoutWon)}` : ""}
                    </span>
                    <span className="pj-row-sub">
                      {r.approvedAt ? `결제 ${formatKst(r.approvedAt)}` : "결제 전"}
                      {r.deliveredAt ? ` · 납품 ${formatKst(r.deliveredAt)}` : ""}
                      {r.completedAt ? ` · 정산 ${formatKst(r.completedAt)}` : ""}
                    </span>
                  </div>
                  <span className="ct-badges">
                    <span className="pj-astatus received">{PAYMENT_STATUS_LABEL[r.status]}</span>
                    <span className="pj-astatus rejected">계약 {CONTRACT_STATUS_LABEL[r.contractStatus]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
