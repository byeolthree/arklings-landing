// AI 평가의 모델 호출(서버 전용). generateText + Output.object로 한 번에 끝나는 생성을 하고, 결과를 다시 검사한다.
// 재시도는 하지 않고(maxRetries: 0), 전체 시간 상한을 둔다(교재 10-3: 자동 재시도도 비용이다).
import { generateText, Output } from "ai";
import { z } from "zod";
import { SLOT_LABELS, type PlanDraft } from "@/lib/plans";
import { classifyAiError, type AiFailCode } from "@/lib/ai/errors";
import { parseEvaluationResult, type EvaluationResult } from "@/lib/ai/evaluation-schema";
import type { ModelHandle } from "@/lib/ai/model";
import { buildEvaluationPrompt, EVALUATE_LOGLINE_INSTRUCTIONS } from "@/lib/prompts/evaluate-logline";

// 모델에게 보여 주는 모양. 제공자의 구조화 출력은 글자 수·개수 제한 같은 세부 규칙을 모두 지원하지 않을 수 있어
// 여기서는 모양(칸 이름·상태·글)만 정하고, 길이·순서·보완 필요일 때 고칠 점은 parseEvaluationResult가 다시 검사한다.
export const evaluationModelSchema = z.object({
  slots: z.array(
    z.object({
      label: z.enum(SLOT_LABELS),
      status: z.enum(["ok", "needs"]),
      reason: z.string(),
      fix: z.string(),
    }),
  ),
});

export const EVALUATE_MAX_OUTPUT_TOKENS = 1200;
export const EVALUATE_TIMEOUT_MS = 30_000;

export type EvaluateOutcome =
  | { ok: true; value: EvaluationResult; usage: { input: number | null; output: number | null }; finishReason: string; model: string }
  | { ok: false; code: AiFailCode };

export async function runEvaluation({ handle, draft, abortSignal }: { handle: ModelHandle; draft: PlanDraft; abortSignal?: AbortSignal }): Promise<EvaluateOutcome> {
  try {
    const result = await generateText({
      model: handle.model,
      instructions: EVALUATE_LOGLINE_INSTRUCTIONS,
      prompt: buildEvaluationPrompt(draft),
      output: Output.object({ schema: evaluationModelSchema }),
      maxRetries: 0,
      maxOutputTokens: EVALUATE_MAX_OUTPUT_TOKENS,
      timeout: { totalMs: EVALUATE_TIMEOUT_MS },
      abortSignal,
    });
    const parsed = parseEvaluationResult(result.output);
    if (!parsed.ok) return { ok: false, code: "schema" };
    return {
      ok: true,
      value: parsed.value,
      usage: { input: result.usage?.inputTokens ?? null, output: result.usage?.outputTokens ?? null },
      finishReason: String(result.finishReason ?? ""),
      model: handle.name,
    };
  } catch (e) {
    const { code, status } = classifyAiError(e);
    console.error("[ai] 평가 호출 실패", { code, status }); // 키와 사용자 글은 남기지 않는다
    return { ok: false, code };
  }
}
