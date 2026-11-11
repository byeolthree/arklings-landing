"use server";

import { getCurrentUser } from "@/lib/auth";
import { evaluateLoglineFlow, type EvaluateResult } from "@/lib/ai/evaluate-flow";
import { getModelHandle } from "@/lib/ai/model";
import { createAuthClient } from "@/lib/supabase/server";

// AI 평가(미션7-2). 화면 계약: evaluateLogline(draft). 모든 확인은 lib/ai/evaluate-flow.ts에 있고, 맨 위에서 로그인·이메일 확인을 다시 한다.
// 서버 전용 열쇠는 쓰지 않는다(로그인한 본인의 권한 RLS로만 DB를 쓴다). 평가는 제안이며 기획안 글·저장·공개 상태를 바꾸지 않는다.
// 이 동작을 쓰는 화면(/planner)은 서버가 모델을 오래 기다릴 수 있으므로, 연결할 때 그 화면 파일에 `export const maxDuration`을 정한다.
export async function evaluateLogline(raw: unknown): Promise<EvaluateResult> {
  return evaluateLoglineFlow(raw, { getUser: getCurrentUser, supabase: createAuthClient, model: getModelHandle });
}
