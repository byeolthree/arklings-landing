import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-collab";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 랜딩(고정 HTML)이 상단 메뉴의 「로그인」/「마이페이지」를 정하려고 부르는 곳. 로그인했는지와 운영자 표시 여부(로그인한 본인 것만)만 알려 주고 다른 정보는 주지 않는다.
export async function GET() {
  const user = await getCurrentUser();
  const isAdmin = user !== null && (await isAdminUser());
  return NextResponse.json({ loggedIn: user !== null, isAdmin }, { headers: { "Cache-Control": "no-store" } });
}
