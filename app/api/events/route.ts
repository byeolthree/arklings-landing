import { handleUsageEvent } from "@/lib/measure/server";
import { createAuthClient } from "@/lib/supabase/server";

// 사용 기록 받는 곳(POST만). 브라우저가 정해진 행동을 알리면 검사해서 DB에 남긴다. 모든 확인은 lib/measure/handler.ts에 있다.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleUsageEvent(request, { supabase: createAuthClient });
}
