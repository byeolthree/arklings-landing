"use client";

import { useEffect, useRef, useState } from "react";
import { EvaluationPanel } from "@/components/ai/evaluation-panel";
import type { EvalErrorKind, EvalSlot, EvalView } from "@/components/ai/types";

// 샘플: 평가는 가짜 결과를 돌려줄 뿐이고, 서버·AI·DB를 부르지 않는다. 남은 횟수 4·3은 임시 숫자다. 디자인이 끝나면 지운다.
const ANSWERS = ["신라가 대가야를 치는 전쟁이 시작되자", "열일곱 화랑 사다함", "성문을 지키는 가야군과 동료의 시기", "첫 전공을 세워 가문의 이름을 지킨다", "소중한 것을 잃는다"];
const SAMPLE_SLOTS: EvalSlot[] = [
  { label: "사건", status: "ok", reason: "이야기를 움직이는 계기가 한 문장에 드러나요.", fix: "" },
  { label: "주인공", status: "ok", reason: "누구의 이야기인지 바로 알 수 있어요.", fix: "" },
  { label: "장애물", status: "needs", reason: "장애물이 두 가지로 나뉘어 어느 쪽이 핵심인지 흐려요.", fix: "주인공이 가장 먼저 넘어야 하는 장애물 하나는 무엇인가요?" },
  { label: "목표", status: "ok", reason: "이루려는 일이 구체적이에요.", fix: "" },
  { label: "위험", status: "needs", reason: "실패하면 잃는 것이 막연해요.", fix: "실패하면 주인공이 가장 아끼는 무엇을 잃나요?" },
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
  const [remaining, setRemaining] = useState(state === "result" ? 3 : 4);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const run = () => {
    setView({ kind: "loading" });
    timer.current = setTimeout(() => {
      setView({ kind: "result", slots: SAMPLE_SLOTS });
      setRemaining((r) => Math.max(0, r - 1));
    }, 1600);
  };

  const filled = [true, true, state !== "missing", true, state !== "missing"];
  return (
    <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "24px 16px 64px", boxSizing: "border-box" }}>
      <div style={{ height: 36, borderRadius: 12, border: "1px dashed #cfc3c9", display: "flex", alignItems: "center", padding: "0 16px", fontSize: 12, color: "#574a50", marginBottom: 12 }}>
        기획안 · 로그라인 — 다섯 칸과 직접 고친 글 (이 위쪽)
      </div>
      <EvaluationPanel view={view} filled={filled} answers={ANSWERS} remaining={remaining} onRun={run} />
    </div>
  );
}
