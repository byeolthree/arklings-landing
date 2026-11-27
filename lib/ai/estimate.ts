// AI 단가 분석의 모델 호출(서버 전용). AI 평가(evaluate.ts)와 같은 방식: generateText + Output.object, SDK 자체 재시도 없음, 시간 상한.
// 결과 검사에 실패하면 한 번만 다시 요청한다(두 번째도 실패하면 결과를 보이지 않는다). 연결·한도 오류는 다시 요청하지 않는다.
import { generateText, Output } from "ai";
import { classifyAiError, type AiFailCode } from "@/lib/ai/errors";
import { estimateModelSchema, parseEstimateResult, type EstimateResult } from "@/lib/ai/estimate-schema";
import type { ModelHandle } from "@/lib/ai/model";
import { buildEstimatePrompt, ESTIMATE_INSTRUCTIONS, type EstimateInput } from "@/lib/prompts/estimate-project";

export const ESTIMATE_MAX_OUTPUT_TOKENS = 2500;
export const ESTIMATE_TIMEOUT_MS = 25_000; // 한 번 부르는 상한. 두 번 불러도 화면의 서버 상한(60초) 안이다.
export const ESTIMATE_ATTEMPTS = 2;

export type EstimateOutcome =
  | { ok: true; value: EstimateResult; attempts: number }
  | { ok: false; code: AiFailCode };

export async function runEstimate({ handle, input, abortSignal }: { handle: ModelHandle; input: EstimateInput; abortSignal?: AbortSignal }): Promise<EstimateOutcome> {
  let code: AiFailCode = "schema";
  for (let attempt = 1; attempt <= ESTIMATE_ATTEMPTS; attempt++) {
    try {
      const result = await generateText({
        model: handle.model,
        instructions: ESTIMATE_INSTRUCTIONS,
        prompt: buildEstimatePrompt(input),
        output: Output.object({ schema: estimateModelSchema }),
        maxRetries: 0,
        maxOutputTokens: ESTIMATE_MAX_OUTPUT_TOKENS,
        timeout: { totalMs: ESTIMATE_TIMEOUT_MS },
        abortSignal,
      });
      const parsed = parseEstimateResult(result.output);
      if (parsed.ok) return { ok: true, value: parsed.value, attempts: attempt };
      code = "schema";
      console.error("[ai] 단가 분석 결과 검사 실패", { attempt, reason: parsed.reason }); // 공고 글은 남기지 않는다
    } catch (e) {
      const failed = classifyAiError(e);
      code = failed.code;
      console.error("[ai] 단가 분석 호출 실패", { attempt, code: failed.code, status: failed.status });
      if (failed.code !== "schema") return { ok: false, code }; // 연결·한도·시간 오류는 다시 요청해도 소용없다
    }
  }
  return { ok: false, code };
}
