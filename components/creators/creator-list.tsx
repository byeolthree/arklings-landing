import Link from "next/link";
import { ROLES } from "@/lib/collab";
import { hasFilter, MAX_QUERY, type CreatorFilter } from "./filter";
import { ROLE_TONE } from "./role-tone";
import type { CreatorCard } from "./types";
import "./creators.css";

const MAX_ROLES = 3;

// 자주색(주 색)을 아끼려고, 프로필 원은 보조 색 세 가지(청록·더스티 블루·뮤트 세이지)를 번갈아 쓴다.
// 목록 순서대로 한 칸씩, 줄이 바뀔 때마다 한 칸 더 밀어서 옆 카드·아래 카드와 색이 겹치지 않게 한다.
const TONES = ["teal", "dusty", "sage"] as const;
const toneAt = (index: number) => TONES[(index + Math.floor(index / 3)) % TONES.length];

function rolesText(roles: CreatorCard["roles"]): string {
  const shown = roles.slice(0, MAX_ROLES).map((r) => ROLES[r]);
  const rest = roles.length - shown.length;
  return rest > 0 ? `${shown.join(" · ")} 외 ${rest}` : shown.join(" · ");
}

// 크리에이터 목록 화면. 데이터를 받기만 하고 읽지 않는다(실제 화면과 샘플 미리보기가 함께 쓴다).
export function CreatorList({
  cards,
  total,
  page,
  pages,
  filter,
  profileHref,
  pageHref,
  hiddenFields = {},
}: {
  cards: CreatorCard[];
  total: number;
  page: number;
  pages: number;
  filter: CreatorFilter;
  profileHref: (handle: string) => string;
  // 쪽·검색어·역할을 주소로 바꿔 주는 함수(1쪽이면 page를 생략한다)
  pageHref: (opts: { page?: number; q?: string; role?: string }) => string;
  // 검색 폼이 함께 보내야 하는 다른 주소 값(예: 샘플 미리보기의 state)
  hiddenFields?: Record<string, string>;
}) {
  const filtered = hasFilter(filter);
  return (
    <div className="cr">
      <section className="cr-top">
        <div className="wrap">
          <h1 className="cr-title">크리에이터 — 포트폴리오 탐색</h1>
          <p className="cr-desc">크리에이터를 눌러 프로필과 공개한 기획안을 둘러보세요.</p>
        </div>
      </section>

      <section className="cr-list">
        <div className="wrap">
          <div className="cr-tools">
            <div className="cr-toolbar">
              <form className="cr-search" role="search" method="get">
                {Object.entries(hiddenFields).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                {filter.role && <input type="hidden" name="role" value={filter.role} />}
                <label htmlFor="cr-q" className="sr-only">
                  크리에이터 검색
                </label>
                <input
                  id="cr-q"
                  name="q"
                  type="search"
                  className="cr-input"
                  defaultValue={filter.q}
                  maxLength={MAX_QUERY}
                  placeholder="이름이나 기획안으로 찾기"
                  autoComplete="off"
                />
                <button type="submit" className="btn btn-primary">
                  검색
                </button>
              </form>
              {/* 필터는 평소에 접혀 있다가 「필터」를 눌러야 선택지가 나온다 */}
              <details className="cr-filter">
                <summary className="btn btn-ghost">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 5h18M6 12h12M10 19h4" />
                  </svg>
                  필터{filter.role && <span className="cr-badge">1</span>}
                </summary>
                <div className="cr-filter-panel" role="group" aria-label="역할로 거르기">
                  <p className="cr-filter-title">역할</p>
                  <div className="cr-chips">
                    <Link href={pageHref({ q: filter.q })} className="cr-fchip" aria-current={filter.role ? undefined : "true"}>
                      전체
                    </Link>
                    {(Object.keys(ROLES) as (keyof typeof ROLES)[]).map((r) => (
                      <Link key={r} href={pageHref({ q: filter.q, role: r })} className="cr-fchip" aria-current={filter.role === r ? "true" : undefined}>
                        {ROLES[r]}
                      </Link>
                    ))}
                  </div>
                </div>
              </details>
            </div>
          </div>
          {total === 0 && filtered ? (
            <div className="panel cr-state">
              <h2>맞는 크리에이터가 없어요</h2>
              <p>
                {filter.q ? `「${filter.q}」` : ""}
                {filter.q && filter.role ? " · " : ""}
                {filter.role ? ROLES[filter.role] : ""} 조건에 맞는 크리에이터가 아직 없어요.
              </p>
              <Link href={pageHref({})} className="btn btn-ghost">
                조건 지우기
              </Link>
            </div>
          ) : total === 0 ? (
            <div className="panel cr-state">
              <h2>아직 크리에이터가 없어요</h2>
              <p>기획안을 완성해 포트폴리오에 올리면 크리에이터로 여기에 보여요.</p>
              <Link href="/planner" className="btn btn-primary">
                기획안 만들기 <span className="arrow">→</span>
              </Link>
            </div>
          ) : cards.length === 0 ? (
            <div className="panel cr-state">
              <h2>이 쪽에는 크리에이터가 없어요</h2>
              <p>마지막 쪽은 {pages}쪽이에요.</p>
              <Link href={pageHref({ q: filter.q, role: filter.role })} className="btn btn-ghost">
                첫 쪽으로
              </Link>
            </div>
          ) : (
            <>
              <p className="cr-count">
                {filtered ? "검색 결과" : "총"} {total}명
                {filtered && (
                  <>
                    {" "}
                    ·{" "}
                    <Link href={pageHref({})} className="cr-clear">
                      조건 지우기
                    </Link>
                  </>
                )}
              </p>
              <ul className="cr-grid">
                {cards.map((c, i) => {
                  const tone = toneAt(i);
                  return (
                  <li key={c.handle}>
                    <Link href={profileHref(c.handle)} className="panel cr-card">
                      <div className="cr-who">
                        <span className={`cr-av ${tone}`} aria-hidden="true">
                          {c.name.slice(0, 1)}
                        </span>
                        <div className="cr-who-text">
                          <span className="cr-name">{c.name}</span>
                          <span className="cr-roles">{rolesText(c.roles)}</span>
                        </div>
                      </div>
                      <div className="cr-box">
                        <span className="cr-label">대표 기획안</span>
                        <h3 className="cr-box-title">{c.latest.title}</h3>
                        <p className="cr-box-logline">{c.latest.logline}</p>
                      </div>
                      <ul className="cr-tags" aria-label="역할">
                        {c.roles.map((r) => (
                          <li key={r} className={`cr-tag ${ROLE_TONE[r]}`}>
                            {ROLES[r]}
                          </li>
                        ))}
                      </ul>
                    </Link>
                  </li>
                  );
                })}
              </ul>
              {pages > 1 && (
                <nav className="pager" aria-label="쪽 이동">
                  {page > 1 ? (
                    <Link href={pageHref({ page: page - 1, q: filter.q, role: filter.role })} className="btn btn-ghost">
                      ← 이전
                    </Link>
                  ) : (
                    <span className="btn btn-ghost off" aria-hidden="true">
                      ← 이전
                    </span>
                  )}
                  <span className="now">
                    {page} / {pages}
                  </span>
                  {page < pages ? (
                    <Link href={pageHref({ page: page + 1, q: filter.q, role: filter.role })} className="btn btn-ghost">
                      다음 →
                    </Link>
                  ) : (
                    <span className="btn btn-ghost off" aria-hidden="true">
                      다음 →
                    </span>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
