"use client";

import { useRef, useState } from "react";
import { evaluateLogline, getAiRemaining } from "@/app/actions/ai";
import type { PlanDraft } from "@/lib/plans";
import { trackEvent } from "@/lib/measure/client";
import { EvaluationPanel } from "./evaluation-panel";
import type { EvalView } from "./types";

// 기획안 로그라인 화면 안의 AI 평가 패널을 실제 서버(evaluateLogline)에 잇는 부분. 화면 모양은 evaluation-panel.tsx(시안)가 그대로 그린다.
// 평가는 제안이라 이 부분은 기획안 글·저장·공개 상태를 바꾸지 않는다.
export function EvaluationSection({ draft, initialRemaining, loginHref }: { draft: PlanDraft; initialRemaining: number | null; loginHref?: string }) {
  const [view, setView] = useState<EvalView>({ kind: "idle" });
  const [remaining, setRemaining] = useState<number | null>(initialRemaining);
  const running = useRef(false);

  const run = async () => {
    if (running.current) return; // 연달아 눌러도 한 번만
    running.current = true;
    trackEvent("ai_evaluate_click"); // 사용 기록(누른 것만 남기고 글은 보내지 않는다)
    setView({ kind: "loading" });
    let loginNeeded = false;
    try {
      const r = await evaluateLogline(draft);
      if (r.ok) setView({ kind: "result", slots: r.slots });
      else {
        loginNeeded = r.code === "login";
        setView({ kind: "error", reason: r.code });
      }
    } catch {
      setView({ kind: "error", reason: "retry" }); // 연결이 끊기는 등 서버에서 답을 받지 못한 경우
    } finally {
      running.current = false;
    }
    if (!loginNeeded) void getAiRemaining("evaluate_logline").then((n) => setRemaining(n));
  };

  return <EvaluationPanel view={view} filled={draft.slots.map((s) => s.trim().length > 0)} answers={draft.slots} remaining={remaining} onRun={run} loginHref={loginHref} />;
}
