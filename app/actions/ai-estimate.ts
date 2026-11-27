"use server";

import { isAdminUser } from "@/lib/admin-collab";
import { estimateProjectFlow, type EstimateActionResult } from "@/lib/ai/estimate-flow";
import { getModelHandle } from "@/lib/ai/model";
import { getCurrentUser } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/server";

// AI 단가 분석(공고 올리기·수정 화면). 화면 계약: estimateProject({ title, summary, description, roles }).
// 맨 위에서 로그인·이메일 확인·운영자를 다시 확인한다(lib/ai/estimate-flow.ts). 서버 전용 열쇠는 쓰지 않고, 아무것도 저장하지 않는다.
// 이 동작을 쓰는 화면(/projects/new, /projects/<id>/edit)에는 `export const maxDuration`이 있다(모델을 두 번 부를 수 있다).
export async function estimateProject(raw: unknown): Promise<EstimateActionResult> {
  return estimateProjectFlow(raw, { getUser: getCurrentUser, isAdmin: isAdminUser, supabase: createAuthClient, model: getModelHandle });
}
