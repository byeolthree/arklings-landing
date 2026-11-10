import { SiteNav, type NavNotice } from "@/components/site-nav";
import { toNotices } from "@/lib/nav-notices";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-collab";
import { countNewCollab, listNewCollab } from "@/lib/collab-count";

// 로그인 여부를 서버에서 확인해 메뉴에 넘긴다. 확인이 안 되면(설정 없음·연결 문제) 로그아웃 상태로 보여 준다.
// 로그인했으면 새 협업 신청의 개수와 최근 목록(종 아이콘)도 함께 읽는다. 못 읽으면 개수는 생략하고 목록은 빈다.
export async function SiteHeader() {
  const user = await getCurrentUser();
  const [count, list, admin] = user ? await Promise.all([countNewCollab(), listNewCollab(5), isAdminUser()]) : [null, [], false];
  const notices: NavNotice[] = toNotices(list);
  return <SiteNav loggedIn={user !== null} newCount={count} notices={notices} isAdmin={admin} />;
}
