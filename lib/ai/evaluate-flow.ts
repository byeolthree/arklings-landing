// AI 평가 한 번의 순서(서버 전용). app/actions/ai.ts의 Server Action이 부른다. 시험할 수 있게 필요한 것을 밖에서 넘겨 받는다.
// 순서: 로그인·이메일 확인 → 입력 검사 → 모델 고르기 → 오늘 자리 잡기 → 모델 호출 → (실패하면 자리 돌려주기 | 성공하면 결과 저장).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurrentUser } from "@/lib/auth";
import { classifyAiError } from "@/lib/ai/errors";
import { runEvaluation } from "@/lib/ai/evaluate";
import { EVAL_SECTION, type EvalSlotResult } from "@/lib/ai/evaluation-schema";
import type { ModelHandle } from "@/lib/ai/model";
import { releaseAiUse, reserveAiUse } from "@/lib/ai/usage";
import { parseDraft, SLOT_COUNT } from "@/lib/plans";
import type { EvalErrorKind } from "@/components/ai/types";
import { USAGE_TEXT } from "@/components/ai/usage-text";

export type EvaluateResult = { ok: true; slots: EvalSlotResult[] } | { ok: false; code: EvalErrorKind; error: string; needLogin?: boolean };
export type EvaluateDeps = {
  getUser: () => Promise<CurrentUser | null>;
  supabase: () => Promise<SupabaseClient>;
  model: () => ModelHandle | null;
};

const CONNECT = "AI 연결에 문제가 있어요. 잠시 뒤 다시 시도해 주세요.";
const fail = (code: EvalErrorKind, error: string, needLogin?: boolean): EvaluateResult => ({ ok: false, code, error, ...(needLogin ? { needLogin: true } : {}) });
const FAIL_MESSAGES = {
  auth: CONNECT,
  busy: "지금 요청이 몰려 있어요. 잠시 뒤 다시 시도해 주세요.",
  retry: "평가를 마치지 못했어요. 다시 시도해 주세요.",
  schema: "결과를 화면에 보여 드리지 못했어요. 다시 시도해 주세요.",
} as const;

export async function evaluateLoglineFlow(raw: unknown, deps: EvaluateDeps): Promise<EvaluateResult> {
  // 1) 로그인 · 이메일 확인 (모델 호출 전에 거절)
  const user = await deps.getUser();
  if (!user) return fail("login", "AI 평가는 로그인한 뒤에 쓸 수 있어요.", true);
  if (!user.email || !user.emailConfirmed) return fail("login", "이메일 확인을 먼저 마쳐 주세요. 확인이 끝나면 평가를 받을 수 있어요.");

  // 2) 입력 검사: 모양·길이·문자, 그리고 다섯 칸이 모두 채워졌는지
  const parsed = parseDraft(raw);
  if (!parsed.ok) return fail("input", parsed.error);
  const { draft } = parsed;
  if (draft.slots.length !== SLOT_COUNT || draft.slots.some((s) => !s.trim())) return fail("input", "다섯 칸을 모두 채운 뒤에 평가를 받을 수 있어요.");

  // 3) 모델 고르기 (키·모델 이름이 없으면 호출하지 않는다)
  const handle = deps.model();
  if (!handle) return fail("auth", CONNECT);

  // 4) 오늘 자리 하나 잡기 (확인과 증가를 DB 함수 한 번에)
  const sb = await deps.supabase();
  const hold = await reserveAiUse(sb, "evaluate_logline");
  if (!hold.ok) return hold.reason === "limit" ? fail("limit", USAGE_TEXT.serverLimit) : fail("auth", CONNECT);

  // 5) 모델 호출. 실패하면 잡은 자리를 돌려준다(결과를 받았으면 돌려주지 않는다).
  const out = await runEvaluation({ handle, draft });
  if (!out.ok) {
    await releaseAiUse(sb, hold.holdId);
    return fail(out.code, FAIL_MESSAGES[out.code]);
  }

  // 6) 결과 저장(본인 것만). 저장하지 못해도 이미 받은 결과는 보여 준다. 사용량과 완료 사유만 남기고 키·프롬프트 전문은 남기지 않는다.
  try {
    const { error } = await sb.from("plan_evaluations").insert({
      owner_id: user.id,
      plan_id: null,
      section: EVAL_SECTION,
      input: { slots: draft.slots, checks: draft.checks, edited: draft.edited },
      result: { slots: out.value.slots },
      model: out.model,
      input_tokens: out.usage.input,
      output_tokens: out.usage.output,
      finish_reason: out.finishReason.slice(0, 40),
    });
    if (error) console.error("[ai] 평가 결과를 저장하지 못했습니다.", { code: error.code });
  } catch (e) {
    console.error("[ai] 평가 결과를 저장하지 못했습니다.", { code: classifyAiError(e).code });
  }
  return { ok: true, slots: out.value.slots };
}
