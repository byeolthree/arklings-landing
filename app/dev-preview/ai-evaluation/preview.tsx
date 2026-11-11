"use client";

import { useEffect, useRef, useState } from "react";
import { EvaluationPanel } from "@/components/ai/evaluation-panel";
import type { EvalErrorKind, EvalSlot, EvalView } from "@/components/ai/types";
import "@/components/planner/planner.css";

// 샘플: 평가는 가짜 결과를 돌려줄 뿐이고, 서버·AI·DB를 부르지 않는다. 디자인이 끝나면 지운다.
const SAMPLE_LOGLINE = "마을에 첫 눈이 내린 날, 사다함은 가야와의 국경을 지키라는 명을 받은 후 군대를 이끌고 출정한다. 그렇지 않으면 가문이 몰락한다.";
const SAMPLE_SLOTS: EvalSlot[] = [
  { label: "사건", status: "ok", reason: "어느 날 일어난 사건 하나로 읽히고, 주인공 바깥에서 온 일이에요.", fix: "" },
  { label: "주인공", status: "needs", reason: "직업이나 지위는 보이지만 약점이 드러나지 않아요.", fix: "이 인물의 약점은 무엇이고, 그것이 갈등에 어떻게 영향을 주나요?" },
  { label: "장애물", status: "needs", reason: "무엇이 막는지가 한 가지로 정해지지 않았어요.", fix: "가장 큰 방해 세력은 누구이고, 어떻게 압박해 오나요?" },
  { label: "목표", status: "ok", reason: "성공과 실패가 갈리는 결과로 쓰였어요.", fix: "" },
  { label: "위험", status: "needs", reason: "잃는 것이 구체적이지 않아요.", fix: "실패하면 잃는 것 하나를 한 단어로 말하면 무엇인가요?" },
];

export function EvalPreview({ state }: { state: string }) {
  const initial: EvalView =
    state === "loading"
      ? { kind: "loading" }
      : state === "result"
        ? { kind: "result", slots: SAMPLE_SLOTS }
        : ["login", "input", "limit", "auth", "busy", "retry", "schema"].includes(state)
          ? { kind: "error", reason: state as EvalErrorKind }
          : { kind: "idle" };
  const [view, setView] = useState<EvalView>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const run = () => {
    setView({ kind: "loading" });
    timer.current = setTimeout(() => setView({ kind: "result", slots: SAMPLE_SLOTS }), 1600);
  };

  return (
    <div className="pl">
      <section className="plan-top">
        <div className="wrap">
          <h1>AI 평가 패널 샘플</h1>
          <p>기획안 로그라인 화면에서 직접 고친 글 아래에 들어올 자리예요.</p>
        </div>
      </section>
      <div className="wrap stage">
        <div className="deck">
          <div className="slide-body" style={{ display: "block" }}>
            <div className="qitem">
              <span className="k">06 로그라인 완성</span>
              <h3>다섯 칸이 한 문장으로 모였어요. 직접 다듬어 보세요.</h3>
              <textarea className="answer" rows={4} aria-label="로그라인" readOnly value={SAMPLE_LOGLINE} />
              <EvaluationPanel view={view} missing={state === "missing" ? ["장애물", "위험"] : []} onRun={run} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
