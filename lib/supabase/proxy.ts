import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 로그인 시간이 지났으면 화면을 그리기 전에 한 번 새로고침해 둔다(proxy.ts에서 호출).
// 로그인 쿠키가 없는 방문자는 Supabase에 물어보지 않으므로 느려지지 않는다.
export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // 로그인 쿠키가 담긴 응답이 다른 사람에게 캐시되어 전달되지 않게 하는 헤더
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // 연결 문제로 확인하지 못해도 화면은 그대로 보여 준다(로그아웃 상태로 취급).
  }
  return response;
}
