import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 로그인 정보(쿠키)를 읽고 쓰는 서버용 Supabase 연결이다. 요청마다 새로 만든다.
// 로그인 없이 쓰는 기존 연결(lib/supabase.ts의 getSupabase)과는 따로 둔다.
export async function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)가 없습니다.");
  }
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 화면(서버 컴포넌트)을 그리는 중에는 쿠키를 쓸 수 없다. 세션 새로고침은 proxy.ts가 맡는다.
        }
      },
    },
  });
}
