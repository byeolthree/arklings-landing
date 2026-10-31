import type { Role } from "@/lib/collab";
import type { PublicContent } from "@/lib/plans";

// 크리에이터 목록 카드 한 장에 필요한 값. 실제 읽기(lib/creators.ts)가 생기면 그 결과가 이 모양을 따른다.
// 주인 번호(UUID)는 어디에도 싣지 않는다. 주소에는 공개 주소(handle)만 쓴다.
export type CreatorCard = {
  handle: string;
  name: string; // 공개 이름
  roles: Role[];
  bio?: string; // 크리에이터를 소개하는 한 줄 문구(선택, 200자 이내). 없으면 카드에서 줄을 숨긴다
  planCount: number; // 공개한 기획안 수(1 이상인 사람만 목록에 나온다)
  latest: { title: string; logline: string }; // 가장 최근에 공개한 기획안
};

// 크리에이터 프로필 화면에 필요한 값(프로필 머리글 + 그 사람이 공개한 기획안 카드들).
export type CreatorProfileData = {
  handle: string;
  name: string; // 공개 이름
  roles: Role[];
  bio?: string; // 소개 한 줄 문구(선택). 프로필에서는 줄바꿈되어 모두 보인다
};

export type PlanCard = {
  id: string; // 기획안 번호(UUID). 기획안 상세 주소에 쓰는 유일한 번호다
  title: string;
  logline: string;
  publishedAt: string; // 처음 공개한 시각(ISO)
};

// 기획안 상세 화면에 필요한 값. 작성자의 공개 주소(authorHandle)가 있으면 이름이 프로필 링크가 된다(프로필을 안 만든 사람은 이름만).
// 주인 번호(UUID)는 어디에도 싣지 않는다.
export type PlanDetailData = {
  id: string;
  title: string;
  authorName: string;
  authorHandle?: string;
  authorRoles?: Role[];
  publishedAt: string; // 처음 공개한 시각(ISO)
  content: PublicContent; // 공개용 사본: 완성 글(sections)과 질문별 답(answers)
};
