import type { NewCollabNotice } from "@/lib/collab-count";

export type NavNoticeItem = { id: string; text: string; when: string };

// 시각 표시: 오늘·어제는 「오늘 14:20」, 그 밖은 「11.07 14:20」(한국 시간).
export function whenKst(iso: string): string {
  const d = new Date(iso);
  const kst = (x: Date) => new Date(x.getTime() + 9 * 3600 * 1000);
  const day = (x: Date) => kst(x).toISOString().slice(0, 10);
  const hm = kst(d).toISOString().slice(11, 16);
  const now = new Date();
  if (day(d) === day(now)) return `오늘 ${hm}`;
  if (day(d) === day(new Date(now.getTime() - 24 * 3600 * 1000))) return `어제 ${hm}`;
  return `${day(d).slice(5).replace("-", ".")} ${hm}`;
}

// 종 아이콘 목록 한 줄의 글. 상단 메뉴(SiteHeader)와 홈(/api/session)이 같은 글을 쓴다.
export function toNotices(list: NewCollabNotice[]): NavNoticeItem[] {
  return list.map((n) => ({
    id: n.id,
    text: n.target ? `${n.applicant}님이 「${n.target}」에 협업을 신청했어요` : `${n.applicant}님이 협업을 신청했어요`,
    when: whenKst(n.createdAt),
  }));
}
