"use client";

import Link from "next/link";
import type { EvalErrorKind, EvalView } from "./types";
import "./ai.css";

// AI 평가 패널: 로그라인 화면에서 직접 고친 글 아래에 들어온다. 값만 받아 그리는 부품이라 서버를 부르지 않는다.
// 누르면 무엇을 부를지는 onRun을 넘기는 쪽이 정한다(지금은 가짜 화면만, 서버 연결은 다음 단계).
const ERRORS: Record<EvalErrorKind, { text: string; retry?: boolean; refund?: boolean; login?: boolean; extra?: string }> = {
  login: { text: "AI 평가는 로그인한 뒤에 쓸 수 있어요.", login: true },
  input: { text: "글이 너무 길어서 평가할 수 없어요. 각 칸은 200자 이내, 로그라인은 1000자 이내로 줄여 주세요." },
  limit: { text: "오늘 횟수를 다 썼어요. 내일 다시 가능해요.", extra: "글을 저장하고 다음 단계로 넘어가는 것은 그대로 할 수 있어요." },
  auth: { text: "AI 연결에 문제가 있어요. 잠시 뒤 다시 시도해 주세요.", retry: true, refund: true },
  busy: { text: "지금 요청이 몰려 있어요. 잠시 뒤 다시 시도해 주세요.", retry: true, refund: true },
  retry: { text: "평가가 중간에 멈췄어요. 같은 글로 다시 시도할 수 있어요.", retry: true, refund: true },
  schema: { text: "결과를 읽지 못했어요. 다시 시도해 주세요.", retry: true, refund: true },
};

export function EvaluationPanel({
  view,
  missing,
  onRun,
  loginHref = "/login?next=/planner",
}: {
  view: EvalView;
  missing: string[]; // 아직 비어 있는 칸 이름
  onRun: () => void;
  loginHref?: string;
}) {
  const loading = view.kind === "loading";
  const blocked = missing.length > 0;
  return (
    <div className="ai-box" aria-live="polite">
      <span className="k">AI 평가</span>
      <h3>아클링스 기준으로 다섯 칸을 점검해 볼까요?</h3>
      <p className="hint">평가는 제안이에요. 내 글은 자동으로 바뀌지 않고, 고칠지는 직접 정해요.</p>

      {blocked && (
        <p className="warn">
          아직 비어 있는 칸이 있어요: {missing.join(", ")}. 다섯 칸을 모두 채우면 평가를 받을 수 있어요.
        </p>
      )}

      <div className="row-actions">
        <button type="button" className="btn btn-primary sm" disabled={blocked || loading} onClick={onRun}>
          {view.kind === "result" ? "다시 평가 받기" : "평가 받기"}
        </button>
      </div>

      {loading && (
        <p className="ai-status" role="status">
          <span className="ai-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          기준에 맞춰 읽는 중이에요. 글은 그대로 두고 기다려 주세요.
        </p>
      )}

      {view.kind === "error" && <ErrorNote reason={view.reason} onRun={onRun} loginHref={loginHref} />}

      {view.kind === "result" && (
        <>
          <ul className="ai-slots">
            {view.slots.map((s) => (
              <li key={s.label} className="ai-slot">
                <div className="ai-slot-head">
                  <b>{s.label}</b>
                  <span className={`ai-badge ${s.status}`}>{s.status === "ok" ? "충족" : "보완 필요"}</span>
                </div>
                <p>{s.reason}</p>
                {s.status === "needs" && (
                  <p className="fix">
                    <b>고칠 점</b> {s.fix}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="ai-note">AI가 읽은 제안이에요. 사실과 설정은 아클링스 자료와 직접 대조해 주세요.</p>
        </>
      )}
    </div>
  );
}

function ErrorNote({ reason, onRun, loginHref }: { reason: EvalErrorKind; onRun: () => void; loginHref: string }) {
  const e = ERRORS[reason];
  return (
    <div className={`notice${e.login ? " login" : ""}`} role="alert">
      <p>{e.text}</p>
      {e.refund && <p className="ai-note">오늘 횟수는 줄지 않았어요.</p>}
      {e.extra && <p className="ai-note">{e.extra}</p>}
      {(e.login || e.retry) && (
        <div className="row-actions">
          {e.login && (
            <Link href={loginHref} className="btn btn-primary sm">
              로그인하러 가기
            </Link>
          )}
          {e.retry && (
            <button type="button" className="btn btn-ghost sm" onClick={onRun}>
              다시 시도
            </button>
          )}
        </div>
      )}
    </div>
  );
}
