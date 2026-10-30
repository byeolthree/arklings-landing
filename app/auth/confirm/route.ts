import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { createAuthClient } from "@/lib/supabase/server";

const OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

// 이메일 확인 링크가 들어오는 곳. token_hash 방식은 메일을 다른 기기에서 열어도 동작한다.
// 확인에 성공하면 로그인된 상태로 보던 화면(next)으로 돌려보내고, 실패하면 다음 행동이 있는 안내 화면으로 보낸다.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");
  const next = safeNext(params.get("next"));

  let ok = false;
  try {
    const supabase = await createAuthClient();
    if (tokenHash && type && OTP_TYPES.includes(type)) {
      const { error } = await supabase.auth.verifyOtp({ type: type as "signup", token_hash: tokenHash });
      ok = !error;
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      ok = !error;
    }
  } catch {
    ok = false;
  }

  if (ok) redirect(next);
  redirect(`/auth/link-expired?next=${encodeURIComponent(next)}`);
}
