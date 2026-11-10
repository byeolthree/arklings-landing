import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 홈(고정 HTML)의 드롭다운 「로그아웃」이 부르는 곳. 다른 화면은 Server Action(signOut)을 쓰고, 이쪽은 같은 일을 하는 POST 주소다.
// 다른 사이트에서 몰래 보낸 요청은 막는다(출처가 이 사이트일 때만 처리). 이 기기에서만 로그아웃하고 홈으로 돌려보낸다.
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  let sameSite = false;
  try {
    sameSite = origin !== null && host !== null && new URL(origin).host === host;
  } catch {
    sameSite = false;
  }
  if (!sameSite) return new NextResponse(null, { status: 403 });
  try {
    const supabase = await createAuthClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // 연결이 안 돼도 홈으로 돌려보낸다.
  }
  return NextResponse.redirect(new URL("/", request.url), 303);
}
