import { ROLES, type Role } from "@/lib/collab";
import { GENRES } from "./genres";
import { FORM_LABEL, type CreatorCard, type WorkForm } from "./types";

// 크리에이터 목록의 검색·필터 값. 주소의 ?q=(검색어) ?role=(역할 하나) ?genre=(장르 하나) ?form=(long|short) ?open=1(협업 받는 중)에서 읽는다.
// 검색은 카드에 보이는 글(공개 이름, 소개 글 앞부분, 대표 기획안 제목·한 줄 소개)에서만 찾는다.
export const MAX_QUERY = 30;

export type CreatorFilter = { q: string; role?: Role; genre?: string; form?: WorkForm; open?: boolean };

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(ROLES, v);
}
const isGenre = (v: unknown): v is string => typeof v === "string" && GENRES.includes(v);
const isForm = (v: unknown): v is WorkForm => typeof v === "string" && Object.prototype.hasOwnProperty.call(FORM_LABEL, v);

// 모르는 값은 무시하고, 검색어는 앞뒤 공백을 지우고 30자까지만 쓴다.
export function parseFilter(raw: { q?: string; role?: string; genre?: string; form?: string; open?: string }): CreatorFilter {
  const q = (raw.q ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY);
  return { q, role: isRole(raw.role) ? raw.role : undefined, genre: isGenre(raw.genre) ? raw.genre : undefined, form: isForm(raw.form) ? raw.form : undefined, open: raw.open === "1" ? true : undefined };
}

export const hasFilter = (f: CreatorFilter) => f.q !== "" || activeCount(f) > 0;
// 「필터」 버튼 옆 숫자(검색어는 세지 않는다)
export const activeCount = (f: CreatorFilter) => [f.role, f.genre, f.form, f.open].filter(Boolean).length;

// 샘플 미리보기용 걸러 내기(실제 화면은 DB에서 같은 규칙으로 거른다).
export function matchesFilter(c: CreatorCard, f: CreatorFilter): boolean {
  if (f.role && !c.roles.includes(f.role)) return false;
  if (f.genre && !c.genres.includes(f.genre)) return false;
  if (f.form && !c.forms.includes(f.form)) return false;
  if (f.open && !c.openToCollab) return false;
  if (!f.q) return true;
  const needle = f.q.toLowerCase();
  return [c.name, c.bio ?? "", c.latest.title, c.latest.logline].some((t) => t.toLowerCase().includes(needle));
}
