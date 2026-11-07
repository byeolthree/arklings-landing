import type { Role } from "@/lib/collab";
import type { PublicContent } from "@/lib/plans";

// 작품의 분량(목록 필터용)과 종류(프로필 작품 카드의 「종류」 표시용). 이름은 별뜨리님 지시(2026-11-05)를 그대로 쓴다.
export const FORM_LABEL = { long: "롱폼", short: "숏폼" } as const;
export type WorkForm = keyof typeof FORM_LABEL;
export const WORK_KINDS = ["로그라인", "아웃라인", "시리즈 바이블", "파일럿", "피치 문서", "피치 영상", "스토리 없는 이미지·영상"] as const;
export type WorkKind = (typeof WORK_KINDS)[number];

export type HeroKind = "image" | "video";

// 크리에이터 목록 카드 한 장에 필요한 값. 실제 읽기(lib/creators.ts)가 생기면 그 결과가 이 모양을 따른다.
// 주인 번호(UUID)는 어디에도 싣지 않는다. 주소에는 공개 주소(handle)만 쓴다.
export type CreatorCard = {
  handle: string;
  name: string; // 닉네임
  roles: Role[];
  bio?: string; // 소개 글의 앞부분(선택). 카드에는 두 줄까지 보이고 없으면 그 줄을 숨긴다(D26)
  planCount: number; // 공개한 작품 수(1 이상인 사람만 목록에 나온다)
  openToCollab: boolean; // 협업 신청 받는 중(카드에 표시와 「협업 신청」 버튼)
  genres: string[]; // 공개한 작품 전체의 장르(목록 필터용)
  forms: WorkForm[]; // 공개한 작품 전체의 분량(목록 필터용)
  latest: { title: string; logline: string; genres?: string[] }; // 대표 작품(가장 최근에 공개한 작품)과 그 장르(D37)
  hero?: HeroKind; // 크리에이터가 자기를 대표하도록 올린 이미지나 영상(없으면 안 걸림)
  heroSrc?: string; // 그 파일 주소(샘플은 일부만 있고, 없으면 자리 표시)
  main: "logline" | "media"; // 카드의 메인: 아트디렉터·영상 제작은 로그라인이 아니라 대표 이미지·영상을 걸 수 있다
};

// 크리에이터 프로필 화면에 필요한 값(프로필 머리글 + 그 사람이 공개한 기획안 카드들).
export type CreatorProfileData = {
  handle: string;
  name: string; // 공개 이름
  roles: Role[];
  bio?: string; // 소개 글(선택). 프로필에서는 줄바꿈되어 모두 보인다
  channels?: { label: string; url: string }[]; // 채널 링크(이름·주소, 5개까지)
  openToCollab?: boolean; // 협업 신청 받는 중(켬)
  hero?: HeroKind; // 프로필 맨 위에 크게 걸리는 대표 이미지 또는 영상(없으면 닉네임만 크게)
  heroSrc?: string; // 대표 영상·이미지 파일 주소(샘플은 일부만 있고, 없으면 자리 표시)
};

// 프로필의 작품 카드 한 장. 마이페이지 「포트폴리오 등록」의 작품 카드와 같은 값(대표 이미지·영상은 실제 연결 때 더한다).
export type WorkCard = {
  id: string;
  title: string;
  logline: string;
  roles: Role[];
  genres: string[];
  kind: WorkKind | null; // 작품 종류(실제 작품은 비어 있을 수 있다)
  form: WorkForm | null;
  publishedAt: string;
  slides?: string[]; // 카드에 걸 대표 이미지·영상 자리(안 주면 샘플 자리 표시, 빈 목록이면 안 보임)
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
