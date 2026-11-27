"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { approveCompletion, cancelContract, requestDelivery, respondOffer, signContract, type ContractState } from "@/app/actions/contracts";
import { ConfirmPopup } from "@/components/ui/alert-popup";
import { CONTRACT_STATUS_LABEL, feeOf, PAYMENT_STATUS_LABEL, payoutOf, won } from "@/lib/contract-labels";
import type { Contract, Payment } from "@/lib/contracts";
import { formatKst } from "@/lib/time";
import "../creators/creators.css";
import "../projects/projects.css";
import { PayButton } from "./pay-button";

type Act = { key: string; label: string; confirm: string; run: () => Promise<ContractState> };

// 계약 화면(크리에이터·운영자 공용). 계약서 내용과 상태별 버튼을 보여 준다. 모든 처리는 확인 팝업 뒤에 서버 동작을 부르고, 끝나면 화면이 새로 그려진다.
// 버튼은 안내일 뿐이다. 당사자·상태 확인은 서버 동작과 DB 함수가 다시 한다.
export function ContractView({ contract: c, payment: p, role, tossClientKey }: { contract: Contract; payment: Payment | null; role: "creator" | "admin"; tossClientKey: string }) {
  const [act, setAct] = useState<Act | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [result, setResult] = useState<ContractState | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    if (!act) return;
    const current = act;
    setAct(null);
    setResult(null);
    startTransition(async () => setResult(await current.run()));
  };

  const mySigned = role === "creator" ? c.creatorSignedAt : c.adminSignedAt;
  const paid = p?.status === "paid" || p?.status === "paid_out";
  const fee = feeOf(c.amountWon);
  const payout = payoutOf(c.amountWon);

  const cancel: Act = { key: "cancel", label: "계약 취소", confirm: "계약을 취소할까요? 지원은 거절 처리되고 공고는 다시 모집 중이 돼요.", run: () => cancelContract(c.id) };
  const sign: Act = { key: "sign", label: "서명하기", confirm: "이 계약서에 서명할까요? 양측이 모두 서명하면 계약이 체결돼요.", run: () => signContract(c.id) };

  const btn = (a: Act, kind: "primary" | "ghost", disabled = false) => (
    <button key={a.key} type="button" className={`btn btn-${kind}`} disabled={pending || disabled} onClick={() => setAct(a)}>
      {a.label}
    </button>
  );

  let note = "";
  let buttons: React.ReactNode = null;
  if (c.status === "offered") {
    if (role === "creator") {
      note = "운영자가 아래 금액과 기간을 제시했어요. 동의하면 계약서 서명으로 넘어가요.";
      buttons = (
        <>
          {btn({ key: "agree", label: "동의하기", confirm: "제시한 금액과 기간에 동의할까요? 동의한 날이 작업 시작일이 돼요.", run: () => respondOffer(c.id, true) }, "primary")}
          {btn({ key: "decline", label: "거부하기", confirm: "제시를 거부할까요? 다시 제안받을 수 없고 공고는 다시 모집 중이 돼요.", run: () => respondOffer(c.id, false) }, "ghost")}
          {btn(cancel, "ghost")}
        </>
      );
    } else {
      note = "크리에이터의 동의를 기다리고 있어요.";
      buttons = btn(cancel, "ghost");
    }
  } else if (c.status === "signing") {
    if (!mySigned) {
      note = role === "creator" ? "계약서 내용을 확인하고 동의하면 서명할 수 있어요." : "계약서에 서명해 주세요. 양측이 서명하면 체결돼요.";
      buttons = (
        <>
          {role === "creator" && (
            <label className="ct-agree">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> 계약서 내용을 확인했고 동의합니다.
            </label>
          )}
          {btn(sign, "primary", role === "creator" && !agreed)}
          {btn(cancel, "ghost")}
        </>
      );
    } else {
      note = "내 서명은 끝났어요. 상대방의 서명을 기다리고 있어요.";
      buttons = btn(cancel, "ghost");
    }
  } else if (c.status === "active") {
    if (role === "admin") {
      if (!paid) {
        note = "계약이 체결되었어요. 대금을 결제해 주세요(테스트 결제예요).";
        buttons = <PayButton contractId={c.id} orderName={c.projectTitle} clientKey={tossClientKey} />;
      } else if (!p?.deliveredAt) {
        note = "결제가 끝났어요. 크리에이터가 납품하기를 기다리고 있어요.";
      } else {
        note = "크리에이터가 납품했어요. 확인한 뒤 정산해 주세요.";
        buttons = btn({ key: "complete", label: "정산하기", confirm: `납품을 확인했나요? 수수료 ${won(fee)}를 뺀 ${won(payout)}을 크리에이터 정산으로 기록하고 계약을 끝내요(실제 이체는 없어요).`, run: () => approveCompletion(c.id) }, "primary");
      }
    } else if (!paid) {
      note = "계약이 체결되었어요. 운영자의 결제를 기다리고 있어요.";
    } else if (!p?.deliveredAt) {
      note = "결제가 끝났어요. 작업을 마쳤다면 납품해 주세요.";
      buttons = btn({ key: "deliver", label: "납품하기", confirm: "납품할까요? 운영자가 확인하고 정산하면 계약이 끝나요.", run: () => requestDelivery(c.id) }, "primary");
    } else {
      note = "납품했어요. 운영자가 확인하고 정산하기를 기다리고 있어요.";
    }
  } else if (c.status === "completed") {
    note = "정산이 기록되고 계약이 끝났어요.";
  } else {
    note = c.status === "declined" ? "크리에이터가 금액 제시를 거부했어요." : "계약이 취소되었어요.";
  }

  return (
    <div className="cr pj">
      <section className="cr-list">
        <div className="wrap pj-formwrap pj-managewrap">
          <Link href={role === "admin" ? "/projects/mine" : "/mypage/applications"} className="cr-back">
            ← {role === "admin" ? "내 프로젝트" : "내 지원 현황"}
          </Link>
          <p className="pj-eyebrow">계약</p>
          <h1 className="pj-form-title">{c.projectTitle || "내려간 공고예요"}</h1>
          <div className="pj-manage-head">
            <span className={`pj-badge ct-${c.status}`}>{CONTRACT_STATUS_LABEL[c.status]}</span>
            {p && <span className="pj-form-sub">결제: {PAYMENT_STATUS_LABEL[p.status]}</span>}
          </div>

          {result?.message && (
            <p className={result.ok ? "pj-posted" : "pj-error"} role={result.ok ? "status" : "alert"}>
              {result.message}
            </p>
          )}
          {pending && (
            <p className="pj-note" role="status">
              처리하는 중이에요…
            </p>
          )}

          <div className="panel ct-doc">
            <h2 className="ct-doc-title">계약서</h2>
            <dl className="ct-dl">
              <div>
                <dt>공고</dt>
                <dd>{c.projectTitle || "내려간 공고"}</dd>
              </div>
              <div>
                <dt>의뢰인(운영자)</dt>
                <dd>{c.adminName}</dd>
              </div>
              <div>
                <dt>크리에이터</dt>
                <dd>{c.creatorName}</dd>
              </div>
              <div>
                <dt>계약 금액</dt>
                <dd>
                  <b>{won(c.amountWon)}</b>
                </dd>
              </div>
              <div>
                <dt>작업 기간</dt>
                <dd>{c.days}일</dd>
              </div>
              <div>
                <dt>작업 시작·종료</dt>
                <dd>{c.startsOn && c.endsOn ? `${c.startsOn} ~ ${c.endsOn}` : "크리에이터가 동의하면 정해져요"}</dd>
              </div>
            </dl>
            <p className="ct-fee">
              수수료 10%는 {won(fee)}이고, 완료 뒤 크리에이터 정산액은 {won(payout)}이에요. 이 금액은 실제 이체가 아니라 기록이에요.
            </p>
            <dl className="ct-dl ct-sign">
              <div>
                <dt>운영자 서명</dt>
                <dd>{c.adminSignedAt ? formatKst(c.adminSignedAt) : "서명 전"}</dd>
              </div>
              <div>
                <dt>크리에이터 서명</dt>
                <dd>{c.creatorSignedAt ? formatKst(c.creatorSignedAt) : "서명 전"}</dd>
              </div>
            </dl>
          </div>

          {p && (
            <div className="panel ct-doc">
              <h2 className="ct-doc-title">결제·정산</h2>
              <dl className="ct-dl">
                <div>
                  <dt>상태</dt>
                  <dd>{PAYMENT_STATUS_LABEL[p.status]}</dd>
                </div>
                <div>
                  <dt>결제 금액</dt>
                  <dd>{won(p.amountWon)}</dd>
                </div>
                <div>
                  <dt>결제 승인</dt>
                  <dd>{p.approvedAt ? formatKst(p.approvedAt) : "-"}</dd>
                </div>
                <div>
                  <dt>납품</dt>
                  <dd>{p.deliveredAt ? formatKst(p.deliveredAt) : "-"}</dd>
                </div>
                <div>
                  <dt>정산</dt>
                  <dd>{p.completedAt ? formatKst(p.completedAt) : "-"}</dd>
                </div>
                {p.status === "paid_out" && p.feeWon !== null && p.payoutWon !== null && (
                  <div>
                    <dt>수수료 · 정산액</dt>
                    <dd>
                      {won(p.feeWon)} · {won(p.payoutWon)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <p className="pj-note">{note}</p>
          {buttons && <div className="ct-act">{buttons}</div>}
        </div>
      </section>
      {act && (
        <ConfirmPopup confirmLabel={act.label} cancelLabel="취소" onConfirm={run} onCancel={() => setAct(null)} onClose={() => setAct(null)}>
          {act.confirm}
        </ConfirmPopup>
      )}
    </div>
  );
}
