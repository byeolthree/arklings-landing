import { ROLES, type Role } from "@/lib/collab";
import type { CreatorCard } from "./types";

// 크리에이터 목록의 검색·필터 값. 주소의 ?q=(검색어)와 ?role=(역할 하나)에서 읽는다.
// 검색은 카드에 보이는 글(공개 이름, 대표 기획안 제목·한 줄 소개)에서만 찾는다.
export const MAX_QUERY = 30;

export type CreatorFilter = { q: string; role?: Role };

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(ROLES, v);
}

// 모르는 역할 값은 무시하고, 검색어는 앞뒤 공백을 지우고 30자까지만 쓴다.
export function parseFilter(rawQ: string | undefined, rawRole: string | undefined): CreatorFilter {
  const q = (rawQ ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY);
  return { q, role: isRole(rawRole) ? rawRole : undefined };
}

export const hasFilter = (f: CreatorFilter) => f.q !== "" || f.role !== undefined;

// 샘플 미리보기용 걸러 내기(실제 화면은 DB에서 같은 규칙으로 거른다).
export function matchesFilter(c: CreatorCard, f: CreatorFilter): boolean {
  if (f.role && !c.roles.includes(f.role)) return false;
  if (!f.q) return true;
  const needle = f.q.toLowerCase();
  return [c.name, c.latest.title, c.latest.logline].some((t) => t.toLowerCase().includes(needle));
}
