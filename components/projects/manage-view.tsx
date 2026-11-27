"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { acceptWithOffer, type ContractState } from "@/app/actions/contracts";
import { closeProject, rejectApplication, type ManageState } from "@/app/actions/projects";
import { ConfirmPopup } from "@/components/ui/alert-popup";
import "../creators/creators.css";
import "./projects.css";

export type ManageApplicant = {
  id: string;
  status: "received" | "accepted" | "rejected";
  statusLabel: string;
  name: string;
  motive: string;
  offer: string | null; // 「300만 원」
  offerWon: number | null; // 제안 보상을 원으로 바꾼 값(수락 금액 칸의 기본값)
  period: string | null;
  createdLabel: string;
  decidedLabel: string | null;
  work: { id: string; title: string } | null; // 공개 작품이면 제목, 아니면 null
};

type Op = { kind: "accept" | "reject" | "close"; applicationId?: string; name?: string; amountWon?: string; days?: string };

// 지원자 관리 화면(운영자). 수락·거절·모집 마감은 확인 팝업 뒤에 DB 함수(accept_application·reject_application·close_project)를 부른다.
// 알림(수락·자동 거절·직접 거절·마감)은 DB 함수가 만든다. 처리가 끝나면 화면이 새로 그려진다(revalidatePath).
export function ManageView({
  project,
  applicants,
  failed,
}: {
  project: { id: string; title: string; status: "open" | "soon" | "closed"; statusLabel: string };
  applicants: ManageApplicant[];
  failed: boolean;
}) {
  const [op, setOp] = useState<Op | null>(null);
  const [result, setResult] = useState<(ManageState & { contractId?: string }) | null>(null);
  const [acceptFor, setAcceptFor] = useState<string | null>(null); // 금액·기간을 적는 중인 지원
  const [amountWon, setAmountWon] = useState("");
  const [days, setDays] = useState("");
  const [pending, startTransition] = useTransition();

  const run = () => {
    if (!op) return;
    const current = op;
    setOp(null);
    setResult(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("project_id", project.id);
      if (current.applicationId) fd.set("application_id", current.applicationId);
      if (current.kind === "accept") {
        fd.set("amount_won", current.amountWon ?? "");
        fd.set("days", current.days ?? "");
        const res: ContractState = await acceptWithOffer({}, fd);
        setResult(res);
        if (res.ok) setAcceptFor(null);
        return;
      }
      const fn = current.kind === "reject" ? rejectApplication : closeProject;
      setResult(await fn({}, fd));
    });
  };

  const received = applicants.filter((a) => a.status === "received").length;
  const confirmText =
    op?.kind === "accept"
      ? `${op.name}님을 수락하고 ${Number(op.amountWon).toLocaleString("ko-KR")}원, ${op.days}일로 제시할까요? 나머지 접수 지원은 자동으로 거절되고 공고는 마감돼요. 크리에이터가 동의해야 계약서 서명으로 넘어가요.`
      : op?.kind === "reject"
        ? `${op.name}님의 지원을 거절할까요? 공고는 계속 열려 있어요.`
        : `모집을 마감할까요? 아직 처리하지 않은 지원 ${received}건은 거절 처리되고 지원자에게 알림이 가요.`;

  return (
    <div className="cr pj">
      <section className="cr-list">
        <div className="wrap pj-formwrap pj-managewrap">
          <Link href={`/projects/${project.id}`} className="cr-back">
            ← 공고로 돌아가기
          </Link>
          <p className="pj-eyebrow">지원자 관리</p>
          <h1 className="pj-form-title">{project.title}</h1>
          <div className="pj-manage-head">
            <span className={`pj-badge ${project.status}`}>{project.statusLabel}</span>
            <span className="pj-form-sub">
              지원 {applicants.length}건 · 접수 {received}건
            </span>
            {project.status !== "closed" && (
              <button type="button" className="btn btn-ghost pj-manage-close" disabled={pending} onClick={() => setOp({ kind: "close" })}>
                모집 마감하기
              </button>
            )}
          </div>

          {result?.message && (
            <p className={result.ok ? "pj-posted" : "pj-error"} role={result.ok ? "status" : "alert"}>
              {result.message}
              {result.contractId && (
                <>
                  {" "}
                  <Link href={`/contracts/${result.contractId}`}>계약 보기</Link>
                </>
              )}
            </p>
          )}
          {pending && (
            <p className="pj-note" role="status">
              처리하는 중이에요…
            </p>
          )}

          {failed ? (
            <div className="panel cr-state" role="alert">
              <h2>지원 목록을 불러오지 못했어요</h2>
              <p>잠시 뒤에 다시 열어 주세요.</p>
            </div>
          ) : applicants.length === 0 ? (
            <div className="panel cr-state">
              <h2>아직 지원한 사람이 없어요</h2>
              <p>지원이 들어오면 여기에 보이고 알림도 가요.</p>
            </div>
          ) : (
            <ul className="pj-applicants">
              {applicants.map((a) => (
                <li key={a.id} className="panel pj-applicant">
                  <div className="pj-applicant-top">
                    <b className="pj-applicant-name">{a.name}</b>
                    <span className={`pj-astatus ${a.status}`}>{a.statusLabel}</span>
                    <span className="pj-applicant-time">
                      지원 {a.createdLabel}
                      {a.decidedLabel ? ` · 처리 ${a.decidedLabel}` : ""}
                    </span>
                  </div>
                  <p className="pj-applicant-motive pj-pre">{a.motive}</p>
                  <dl className="pj-applicant-meta">
                    <div>
                      <dt>포트폴리오</dt>
                      <dd>
                        {a.work ? (
                          <Link href={`/portfolio/${a.work.id}`} target="_blank" rel="noreferrer">
                            {a.work.title}
                          </Link>
                        ) : (
                          "비공개 작품"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>제안 보상</dt>
                      <dd>{a.offer ?? "없음"}</dd>
                    </div>
                    <div>
                      <dt>가능한 기간</dt>
                      <dd>{a.period ?? "없음"}</dd>
                    </div>
                  </dl>
                  {a.status === "received" && acceptFor === a.id && (
                    <div className="pj-offer">
                      <p className="pj-note">수락하면 금액과 기간을 제시해요. 금액은 원 단위(1만 원~10억 원), 기간은 일 단위(1~365일)예요.</p>
                      <div className="pj-field-row">
                        <div className="pj-field">
                          <label htmlFor={`pj-amount-${a.id}`}>제시 금액 (원)</label>
                          <input id={`pj-amount-${a.id}`} type="text" inputMode="numeric" value={amountWon} onChange={(e) => setAmountWon(e.target.value.replace(/[^\d]/g, ""))} placeholder="예) 2500000" />
                        </div>
                        <div className="pj-field">
                          <label htmlFor={`pj-days-${a.id}`}>작업 기간 (일)</label>
                          <input id={`pj-days-${a.id}`} type="text" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/[^\d]/g, ""))} placeholder="예) 30" />
                        </div>
                      </div>
                      <div className="pj-applicant-act">
                        <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => setAcceptFor(null)}>
                          취소
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={pending || !(Number(amountWon) >= 10000 && Number(amountWon) <= 1000000000 && Number(days) >= 1 && Number(days) <= 365)}
                          onClick={() => setOp({ kind: "accept", applicationId: a.id, name: a.name, amountWon, days })}
                        >
                          수락하고 제시하기
                        </button>
                      </div>
                    </div>
                  )}
                  {a.status === "received" && acceptFor !== a.id && (
                    <div className="pj-applicant-act">
                      <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => setOp({ kind: "reject", applicationId: a.id, name: a.name })}>
                        거절하기
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={pending}
                        onClick={() => {
                          setAcceptFor(a.id);
                          setAmountWon(a.offerWon === null ? "" : String(a.offerWon));
                          setDays("");
                        }}
                      >
                        수락하기
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      {op && (
        <ConfirmPopup confirmLabel={op.kind === "accept" ? "수락하고 제시하기" : op.kind === "reject" ? "거절하기" : "마감하기"} cancelLabel="취소" onConfirm={run} onCancel={() => setOp(null)} onClose={() => setOp(null)}>
          {confirmText}
        </ConfirmPopup>
      )}
    </div>
  );
}
