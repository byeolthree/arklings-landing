import { SiteNav } from "@/components/site-nav";
import { getCurrentUser } from "@/lib/auth";
import { countNewCollab } from "@/lib/collab-count";

// 로그인 여부를 서버에서 확인해 메뉴에 넘긴다. 확인이 안 되면(설정 없음·연결 문제) 로그아웃 상태로 보여 준다.
export async function SiteHeader() {
  const user = await getCurrentUser();
  const newCount = user ? await countNewCollab() : null;
  return <SiteNav loggedIn={user !== null} newCount={newCount} />;
}
