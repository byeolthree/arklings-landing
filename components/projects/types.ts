import type { Role } from "@/lib/collab";

// 프로젝트 공고. 지금은 예시 데이터(sample-data.ts)만 쓴다. 실제 테이블은 다음 단계에서 정한다.
export type ProjectStatus = "open" | "soon" | "closed";
export type ProjectSource = "arklings" | "request";

export const STATUS_LABEL: Record<ProjectStatus, string> = { open: "모집 중", soon: "모집 예정", closed: "모집 마감" };
export const SOURCE_LABEL: Record<ProjectSource, string> = { arklings: "아클링스 추진", request: "협업 의뢰" };

// 보상 구간(최대 보상 기준, 만 원). low ≤ 100, mid ≤ 300, high > 300
export type RewardBand = "low" | "mid" | "high";
export const REWARD_LABEL: Record<RewardBand, string> = { low: "100만 원 이하", mid: "100만~300만 원", high: "300만 원 초과" };

export type ProjectSort = "latest" | "deadline" | "reward";
export const SORT_LABEL: Record<ProjectSort, string> = { latest: "최신순", deadline: "마감임박순", reward: "보상 높은순" };

export type ProjectStep = { label: string; range: string };

// 화면이 쓰는 공고 한 건. DB 보기 projects_public(0030)을 lib/projects.ts가 이 모양으로 바꿔 준다.
// 보상은 둘 다 비면 「협의」(negotiable)이고, 그때 rewardMin·rewardMax는 0이다(보상 구간 거르기에서는 빠진다).
export type Project = {
  id: string;
  title: string;
  summary: string;
  description: string;
  status: ProjectStatus;
  source: ProjectSource;
  roles: Role[]; // 맨 앞이 대표 역할
  genres: string[];
  rewardMin: number; // 만 원
  rewardMax: number; // 만 원
  negotiable: boolean;
  postedAt: string; // YYYY-MM-DD (올린 날, 한국 시간)
  opensAt: string; // YYYY-MM-DD (모집 시작)
  deadline: string; // YYYY-MM-DD (모집 마감)
  workStartsOn: string | null; // 작업 기간(선택)
  workEndsOn: string | null;
  applicants: number;
  selected: number;
  work: { id: string; title: string }; // 연결 작품(source_works). 없으면 id·title이 빈 글자
};

// 예시 데이터(sample-data.ts) 전용 모양. 이어지는 화면이 없는 예시 작품 화면만 쓴다.
export type SampleProject = {
  id: string;
  title: string;
  summary: string;
  status: ProjectStatus;
  source: ProjectSource;
  roles: Role[]; // 맨 앞이 대표 역할
  genres: string[];
  rewardMin: number; // 만 원
  rewardMax: number; // 만 원
  postedAt: string; // YYYY-MM-DD (올린 날)
  opensAt: string; // YYYY-MM-DD (모집 시작)
  deadline: string; // YYYY-MM-DD (모집 마감)
  applicants: number;
  selected: number;
  periodLabel: string; // 「5주」
  periodRange: string; // 「12월 15일 ~ 1월 16일」
  heroNote: string; // 대표 이미지 자리 안내
  intro: { heading: string; body: string };
  scope: { title: string; text: string }[];
  steps: ProjectStep[];
  currentStep: number; // 일정 4단계 중 지금 단계(0부터)
  work: { id: string; title: string; blurb: string; logline: string };
};
