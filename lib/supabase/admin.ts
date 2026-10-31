import { createClient } from "@supabase/supabase-js";

// 서버 전용 열쇠(SUPABASE_SERVICE_ROLE_KEY)로 만드는 연결이다. DB의 접근 규칙(RLS)을 뛰어넘으므로
// 서버 코드(Server Action·Route Handler)에서만 부르고, 반드시 먼저 "이 사람이 해도 되는 일인지" 확인한 뒤에 쓴다.
// 이 값은 NEXT_PUBLIC_ 이름이 아니라서 브라우저 코드에는 실리지 않는다. 화면(클라이언트 컴포넌트)에서 가져다 쓰지 않는다.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("서버 전용 Supabase 설정(SUPABASE_SERVICE_ROLE_KEY)이 없습니다.");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
