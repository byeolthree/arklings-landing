import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-collab";
import { getCurrentUser } from "@/lib/auth";
import { countNewCollab, listNewCollab } from "@/lib/collab-count";
import { toNotices } from "@/lib/nav-notices";

export const dynamic = "force-dynamic";

// 랜딩(고정 HTML)이 상단 메뉴를 그리려고 부르는 곳. 로그인했는지, 운영자 표시 여부, 종 아이콘의 새 협업 신청 개수·최근 목록을 알려 준다.
// 개수·목록·운영자 여부는 로그인한 본인 것만(로그인한 본인의 권한으로 읽는다). 로그아웃이면 loggedIn: false만 준다.
export async function GET() {
  const user = await getCurrentUser();
  const headers = { "Cache-Control": "no-store" };
  if (user === null) return NextResponse.json({ loggedIn: false }, { headers });
  const [isAdmin, newCount, list] = await Promise.all([isAdminUser(), countNewCollab(), listNewCollab(5)]);
  return NextResponse.json({ loggedIn: true, isAdmin, newCount, notices: toNotices(list) }, { headers });
}
