import { SiteNav, type NavNotice } from "@/components/site-nav";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-collab";
import { countNewCollab, listNewCollab } from "@/lib/collab-count";

// 시각 표시: 오늘·어제는 「오늘 14:20」, 그 밖은 「11.07 14:20」(한국 시간).
function whenKst(iso: string): string {
  const d = new Date(iso);
  const kst = (x: Date) => new Date(x.getTime() + 9 * 3600 * 1000);
  const day = (x: Date) => kst(x).toISOString().slice(0, 10);
  const hm = kst(d).toISOString().slice(11, 16);
  const now = new Date();
  if (day(d) === day(now)) return `오늘 ${hm}`;
  if (day(d) === day(new Date(now.getTime() - 24 * 3600 * 1000))) return `어제 ${hm}`;
  return `${day(d).slice(5).replace("-", ".")} ${hm}`;
}

// 로그인 여부를 서버에서 확인해 메뉴에 넘긴다. 확인이 안 되면(설정 없음·연결 문제) 로그아웃 상태로 보여 준다.
// 로그인했으면 새 협업 신청의 개수와 최근 목록(종 아이콘)도 함께 읽는다. 못 읽으면 개수는 생략하고 목록은 빈다.
export async function SiteHeader() {
  const user = await getCurrentUser();
  const [count, list, admin] = user ? await Promise.all([countNewCollab(), listNewCollab(5), isAdminUser()]) : [null, [], false];
  const notices: NavNotice[] = list.map((n) => ({
    id: n.id,
    text: n.target ? `${n.applicant}님이 「${n.target}」에 협업을 신청했어요` : `${n.applicant}님이 협업을 신청했어요`,
    when: whenKst(n.createdAt),
  }));
  return <SiteNav loggedIn={user !== null} newCount={count} notices={notices} isAdmin={admin} />;
}
