import { ROLES, type Role } from "@/lib/collab";
import { REWARD_LABEL, type Project, type ProjectSort, type ProjectStatus, type RewardBand, STATUS_LABEL } from "./types";

// 프로젝트 목록의 검색·필터·정렬 값. 주소의 ?q= ?role= ?status= ?reward= ?sort= ?page= 에서 읽는다.
export const MAX_QUERY = 30;
export const PROJECT_PAGE_SIZE = 10;

export type ProjectFilter = { q: string; role?: Role; status?: ProjectStatus; reward?: RewardBand; sort: ProjectSort };

const isRole = (v: unknown): v is Role => typeof v === "string" && Object.prototype.hasOwnProperty.call(ROLES, v);
const isStatus = (v: unknown): v is ProjectStatus => typeof v === "string" && Object.prototype.hasOwnProperty.call(STATUS_LABEL, v);
const isReward = (v: unknown): v is RewardBand => typeof v === "string" && Object.prototype.hasOwnProperty.call(REWARD_LABEL, v);
const isSort = (v: unknown): v is ProjectSort => v === "latest" || v === "deadline" || v === "reward";

// 모르는 값은 무시하고, 검색어는 앞뒤 공백을 지우고 30자까지만 쓴다.
export function parseFilter(raw: { q?: string; role?: string; status?: string; reward?: string; sort?: string }): ProjectFilter {
  const q = (raw.q ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY);
  return { q, role: isRole(raw.role) ? raw.role : undefined, status: isStatus(raw.status) ? raw.status : undefined, reward: isReward(raw.reward) ? raw.reward : undefined, sort: isSort(raw.sort) ? raw.sort : "latest" };
}

// 「필터」 버튼 옆 숫자(검색어와 정렬은 세지 않는다)
export const activeCount = (f: ProjectFilter) => [f.role, f.status, f.reward].filter(Boolean).length;
export const hasFilter = (f: ProjectFilter) => f.q !== "" || activeCount(f) > 0;

export const rewardBand = (p: Project): RewardBand => (p.rewardMax <= 100 ? "low" : p.rewardMax <= 300 ? "mid" : "high");

function matches(p: Project, f: ProjectFilter): boolean {
  if (f.role && !p.roles.includes(f.role)) return false;
  if (f.status && p.status !== f.status) return false;
  if (f.reward && rewardBand(p) !== f.reward) return false;
  if (!f.q) return true;
  const needle = f.q.toLowerCase();
  return [p.title, p.summary, p.work.title].some((t) => t.toLowerCase().includes(needle));
}

// 마감임박순: 모집 중(마감이 가까운 순) → 모집 예정(모집이 곧 시작하는 순) → 모집 마감(최근 마감 순)
const GROUP: Record<ProjectStatus, number> = { open: 0, soon: 1, closed: 2 };

export function applyFilter(all: Project[], f: ProjectFilter): Project[] {
  const list = all.filter((p) => matches(p, f));
  const byDate = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  if (f.sort === "reward") return list.sort((a, b) => b.rewardMax - a.rewardMax || b.rewardMin - a.rewardMin || byDate(b.postedAt, a.postedAt));
  if (f.sort === "deadline") {
    return list.sort((a, b) => {
      if (a.status !== b.status) return GROUP[a.status] - GROUP[b.status];
      if (a.status === "open") return byDate(a.deadline, b.deadline);
      if (a.status === "soon") return byDate(a.opensAt, b.opensAt);
      return byDate(b.deadline, a.deadline);
    });
  }
  return list.sort((a, b) => byDate(b.postedAt, a.postedAt));
}

// 주소 만들기(1쪽·기본 정렬이면 생략한다)
export function projectsHref({ page, q, role, status, reward, sort }: Partial<ProjectFilter> & { page?: number }): string {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (role) p.set("role", role);
  if (status) p.set("status", status);
  if (reward) p.set("reward", reward);
  if (sort && sort !== "latest") p.set("sort", sort);
  if (page && page > 1) p.set("page", String(page));
  const s = p.toString();
  return `/projects${s ? `?${s}` : ""}`;
}

// ── 날짜 도우미(한국 시간 기준 날짜끼리만 센다) ──
export const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const dayNumber = (ymd: string) => Math.floor(Date.parse(`${ymd}T00:00:00Z`) / 86400000);
export const daysUntil = (ymd: string, today = todayKst()) => dayNumber(ymd) - dayNumber(today);
export const dday = (n: number) => (n === 0 ? "D-day" : n > 0 ? `D-${n}` : `D+${-n}`);
// 「12월 7일」
export const monthDay = (ymd: string) => `${parseInt(ymd.slice(5, 7), 10)}월 ${parseInt(ymd.slice(8, 10), 10)}일`;
// 「250만~400만 원」
export const rewardText = (p: Project) => `${p.rewardMin.toLocaleString("ko-KR")}만~${p.rewardMax.toLocaleString("ko-KR")}만 원`;
