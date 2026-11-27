import { createBrowserClient } from "@supabase/ssr";

// 브라우저(화면 부품)에서 쓰는 Supabase 연결. 로그인 정보는 쿠키에서 읽는다. 실시간 알림 구독처럼 브라우저에서만 되는 일에 쓴다.
// 값이 없으면 null(호출하는 쪽은 구독을 하지 않고 조용히 넘어간다). 서버 전용 열쇠는 여기에 오지 않는다(NEXT_PUBLIC_ 값만 쓴다).
export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
