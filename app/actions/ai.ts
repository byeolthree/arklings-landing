"use server";

import { getCurrentUser } from "@/lib/auth";
import { evaluateLoglineFlow, type EvaluateResult } from "@/lib/ai/evaluate-flow";
import { getModelHandle } from "@/lib/ai/model";
import { readAiRemaining } from "@/lib/ai/usage";
import { createAuthClient } from "@/lib/supabase/server";

// AI 평가(미션7-2). 화면 계약: evaluateLogline(draft). 모든 확인은 lib/ai/evaluate-flow.ts에 있고, 맨 위에서 로그인·이메일 확인을 다시 한다.
// 서버 전용 열쇠는 쓰지 않는다(로그인한 본인의 권한 RLS로만 DB를 쓴다). 평가는 제안이며 기획안 글·저장·공개 상태를 바꾸지 않는다.
// 이 동작을 쓰는 화면(/planner)은 서버가 모델을 오래 기다릴 수 있으므로, 연결할 때 그 화면 파일에 `export const maxDuration`을 정한다.
export async function evaluateLogline(raw: unknown): Promise<EvaluateResult> {
  return evaluateLoglineFlow(raw, { getUser: getCurrentUser, supabase: createAuthClient, model: getModelHandle });
}

// 「오늘 남은 ○번」을 읽는다(화면이 한 번 쓴 뒤 숫자를 새로 고칠 때 부른다). 로그인·이메일 확인이 안 됐거나 읽지 못하면 null.
export async function getAiRemaining(feature: unknown): Promise<number | null> {
  if (feature !== "evaluate_logline" && feature !== "library_ask") return null;
  const user = await getCurrentUser();
  if (!user || !user.email || !user.emailConfirmed) return null;
  try {
    return await readAiRemaining(await createAuthClient(), feature);
  } catch {
    return null;
  }
}
