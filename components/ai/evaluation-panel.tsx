"use client";

import { SLOT_LABELS, MAX_SLOT_CHARS } from "@/lib/plans";
import { ErrorCard, type ErrorAction } from "./error-card";
import type { EvalErrorKind, EvalView } from "./types";
import "./ai.css";

// AI 평가 패널(시안 「AI 평가 ① 평가 전 · ② 호출 중·결과 · ③ 오류 안내」). 값만 받아 그리는 부품이라 서버를 부르지 않는다.
// 누르면 무엇을 부를지는 onRun을 넘기는 쪽이 정한다. 남은 횟수(remaining)도 받는 값이며, 읽는 길은 서버 단계에서 정한다.
const CHECK = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const hasBatchim = (w: string) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0;
};

function summaryOf(needs: string[]): string {
  if (needs.length === 0) return "모든 칸이 기준을 충족했어요. 이대로 직접 다듬어 보세요.";
  const tail = " 보완하면 로그라인이 더 단단해져요.";
  if (needs.length === 1) return `${needs[0]} 한 칸을${tail}`;
  if (needs.length === 2) return `${needs[0]}${hasBatchim(needs[0]) ? "과" : "와"} ${needs[1]} 두 칸을${tail}`;
  return `${needs.join(", ")} ${needs.length}칸을${tail}`;
}

const ERRORS: Record<EvalErrorKind, { pill: string; title: string; desc: string; action?: "login" | "retry" }> = {
  login: { pill: "로그인 안 함", title: "로그인하면 평가를 받을 수 있어요", desc: "평가는 하루에 받을 수 있는 횟수가 정해져 있어서 로그인한 분께만 열려 있어요.", action: "login" },
  input: { pill: "입력이 너무 김", title: "평가할 수 있는 길이를 넘었어요", desc: `칸마다 ${MAX_SLOT_CHARS}자까지 평가할 수 있어요. 글을 줄인 뒤에 다시 눌러 주세요.` },
  limit: { pill: "오늘 횟수를 모두 씀", title: "오늘 쓸 수 있는 평가를 모두 썼어요", desc: "하루에 받을 수 있는 평가 횟수는 정해져 있어요. 내일 다시 받을 수 있어요. 쓰신 글은 그대로예요." },
  auth: { pill: "AI 연결 문제", title: "AI와 연결하지 못했어요", desc: "지금은 평가를 받을 수 없어요. 잠시 뒤에 다시 눌러 보시고, 계속되면 아클링스에 알려 주세요. 오늘 횟수는 줄지 않았어요." },
  busy: { pill: "요청이 몰림", title: "지금 요청이 몰려 있어요", desc: "잠시 뒤에 다시 눌러 주세요. 오늘 횟수는 줄지 않았어요.", action: "retry" },
  retry: { pill: "일시 오류 · 시간 초과", title: "평가를 마치지 못했어요", desc: "시간이 오래 걸리거나 일시적인 오류가 났어요. 다시 눌러 주세요. 오늘 횟수는 줄지 않았어요.", action: "retry" },
  schema: { pill: "결과를 읽지 못함", title: "결과를 화면에 보여 드리지 못했어요", desc: "평가는 했지만 결과의 모양이 맞지 않았어요. 다시 눌러 주세요. 오늘 횟수는 줄지 않았어요.", action: "retry" },
};

export function EvaluationPanel({
  view,
  filled,
  answers,
  remaining,
  onRun,
  loginHref = "/login?next=/planner",
}: {
  view: EvalView;
  filled: boolean[]; // 다섯 칸이 채워졌는지(사건·주인공·장애물·목표·위험 순서)
  answers: string[]; // 다섯 칸에 쓴 글(결과에서 칸마다 인용한다)
  remaining: number | null; // 오늘 남은 평가 수
  onRun: () => void;
  loginHref?: string;
}) {
  const allFilled = filled.length === SLOT_LABELS.length && filled.every(Boolean);
  const missing = SLOT_LABELS.filter((_, i) => !filled[i]);

  if (view.kind === "loading") {
    return (
      <section className="ai ai-card" aria-live="polite">
        <div className="ai-kicker">AI 평가</div>
        <h2 className="ai-h2">로그라인 다섯 칸 점검</h2>
        <p className="ai-status" role="status">
          <span className="ai-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          기준에 맞춰 읽는 중이에요
        </p>
        <ul className="ai-skel" aria-hidden="true">
          {[92, 84, 88, 78, 90].map((w, i) => (
            <li key={i}>
              <div className="a" />
              <div className="b" style={{ width: `${w}%` }} />
            </li>
          ))}
        </ul>
        <div className="ai-row after">
          <button type="button" className="ai-btn" disabled>
            평가하는 중…
          </button>
          <span className="side">잠시만 기다려 주세요.</span>
        </div>
      </section>
    );
  }

  if (view.kind === "result") {
    const needs = view.slots.filter((s) => s.status === "needs").map((s) => s.label);
    const ok = view.slots.length - needs.length;
    const title = needs.length === 0 ? "다섯 칸이 모두 충족이에요" : ok === 0 ? "다섯 칸 모두 보완이 필요해요" : `다섯 칸 중 ${["", "한", "두", "세", "네"][ok]} 칸이 충족이에요`;
    return (
      <section className="ai ai-card" aria-live="polite">
        <div className="ai-kicker">AI 평가 결과</div>
        <h2 className="ai-h2">{title}</h2>
        <p className="ai-lead d-only">{summaryOf(needs)}</p>
        <ul className="ai-slots">
          {view.slots.map((s, i) => (
            <li key={s.label} className={`ai-slot${s.status === "needs" ? " needs" : ""}`}>
              <div className="ai-slot-head">
                <div className="ai-slot-name">
                  {s.label}
                  {answers[i]?.trim() && <small>“{answers[i].trim()}”</small>}
                </div>
                <span className={`ai-badge${s.status === "needs" ? " needs" : ""}`}>{s.status === "ok" ? "충족" : "보완 필요"}</span>
              </div>
              <p>{s.reason}</p>
              {s.status === "needs" && (
                <p className="fix">
                  <b>고칠 점</b>
                  {s.fix}
                </p>
              )}
            </li>
          ))}
        </ul>
        <div className="ai-row after">
          <button type="button" className="ai-btn line" onClick={onRun}>
            다시 평가 받기
          </button>
          {remaining !== null && <span className="side">오늘 남은 평가 {remaining}번</span>}
        </div>
        <p className="ai-foot d-only">평가는 참고용 제안이에요. 쓰신 글, 저장, 공개 상태는 바뀌지 않았어요.</p>
        <p className="m-only">{remaining !== null ? `오늘 남은 평가 ${remaining}번 · ` : ""}쓰신 글은 바뀌지 않았어요</p>
      </section>
    );
  }

  // idle · error: 평가 전 모습 + (오류가 있으면) 아래에 오류 카드
  const err = view.kind === "error" ? ERRORS[view.reason] : null;
  const action: ErrorAction | undefined = err?.action === "login" ? { label: "로그인하기", kind: "primary", href: loginHref } : err?.action === "retry" ? { label: "다시 평가 받기", kind: "line", onClick: onRun } : undefined;
  return (
    <section className="ai ai-card" aria-live="polite">
      <div className="ai-kicker">AI 평가</div>
      <h2 className="ai-h2">로그라인 다섯 칸 점검</h2>
      <p className="ai-lead">{allFilled ? "다섯 칸을 모두 채우셨어요. 평가를 받으면 칸마다 충족 여부와 고칠 점을 알려 드려요." : "아직 비어 있는 칸이 있어요. 다섯 칸을 모두 채우면 평가를 받을 수 있어요."}</p>
      <ul className="ai-chips">
        {SLOT_LABELS.map((label, i) =>
          filled[i] ? (
            <li key={label} className="ai-chip">
              {CHECK}
              {label} · 입력됨
            </li>
          ) : (
            <li key={label} className="ai-chip empty">
              {label} · 비어 있음
            </li>
          ),
        )}
      </ul>
      <div className="ai-row">
        <button type="button" className="ai-btn" disabled={!allFilled} onClick={onRun}>
          평가 받기
        </button>
        <span className="side">{allFilled ? (remaining !== null ? `오늘 남은 평가 ${remaining}번` : "") : `비어 있는 칸: ${missing.join(", ")}`}</span>
      </div>
      <p className="ai-foot">평가는 참고용 제안이에요. 쓰신 글은 바뀌지 않아요.</p>
      {err && <ErrorCard pill={err.pill} title={err.title} desc={err.desc} action={action} />}
    </section>
  );
}
