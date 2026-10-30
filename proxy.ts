import type { NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";

// 로그인 상태를 읽는 화면에서만 실행한다. 랜딩(/)과 정적 파일(public)에는 걸지 않는다.
export async function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  matcher: ["/login", "/signup", "/mypage/:path*", "/auth/:path*", "/privacy", "/collab/:path*", "/planner", "/forgot-password", "/reset-password"],
};
