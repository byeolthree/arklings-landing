import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 랜딩(고정 HTML)이 상단 메뉴의 「로그인」/「마이페이지」를 정하려고 부르는 곳. 로그인했는지만 알려 주고 다른 정보는 주지 않는다.
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ loggedIn: user !== null }, { headers: { "Cache-Control": "no-store" } });
}
