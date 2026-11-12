import { getCurrentUser } from "@/lib/auth";
import { handleLibraryAsk } from "@/lib/ai/library-handler";
import { getModelHandle } from "@/lib/ai/model";
import { createAuthClient } from "@/lib/supabase/server";

// 라이브러리 질의응답(미션7-2). POST만 받는다(다른 방식은 405). 모든 확인은 lib/ai/library-handler.ts에 있다.
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 서버 전체 시간 상한(초). 모델 호출 상한(40초)보다 길게 둔다.

export async function POST(request: Request) {
  return handleLibraryAsk(request, { getUser: getCurrentUser, supabase: createAuthClient, model: getModelHandle });
}
