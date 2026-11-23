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

export type Project = {
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
  work: { title: string; blurb: string; logline: string };
};
