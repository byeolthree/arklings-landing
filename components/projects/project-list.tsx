import Link from "next/link";
import { ROLES } from "@/lib/collab";
import "../creators/creators.css";
import "./projects.css";
import { ProjectCard } from "./project-card";
import { activeCount, hasFilter, MAX_QUERY, projectsHref, type ProjectFilter } from "./filter";
import { REWARD_LABEL, SORT_LABEL, STATUS_LABEL, type Project, type ProjectSort } from "./types";

// 프로젝트 목록 화면. 데이터를 받기만 하고 읽지 않는다. 제목 띠·검색·필터·카드 그리드·쪽 이동은 크리에이터 목록(/creators)과 같은 틀이다.
export function ProjectList({
  items,
  total,
  page,
  pages,
  filter,
  today,
  isAdmin,
  loggedIn = false,
  bookmarkedIds = [],
  failed = false,
}: {
  items: Project[];
  total: number;
  page: number;
  pages: number;
  filter: ProjectFilter;
  today: string;
  isAdmin: boolean;
  loggedIn?: boolean; // 안 했으면 북마크를 누를 때 로그인 화면으로 보낸다
  bookmarkedIds?: string[]; // 내 북마크한 공고 번호들
  failed?: boolean; // 공고를 읽지 못했을 때
}) {
  const marked = new Set(bookmarkedIds);
  const filtered = hasFilter(filter);
  const nFilters = activeCount(filter);
  const href = (o: Partial<ProjectFilter> & { page?: number }) => projectsHref({ ...filter, ...o });
  // 고른 조건 칩: 누르면 그 조건만 빠진다
  const chips: { key: string; label: string; off: string }[] = [];
  if (filter.q) chips.push({ key: "q", label: `「${filter.q}」`, off: href({ q: "", page: 1 }) });
  if (filter.role) chips.push({ key: "role", label: ROLES[filter.role], off: href({ role: undefined, page: 1 }) });
  if (filter.status) chips.push({ key: "status", label: STATUS_LABEL[filter.status], off: href({ status: undefined, page: 1 }) });
  if (filter.reward) chips.push({ key: "reward", label: REWARD_LABEL[filter.reward], off: href({ reward: undefined, page: 1 }) });

  return (
    <div className="cr pj">
      <section className="cr-top">
        <div className="wrap">
          <h1 className="cr-title">프로젝트 모집</h1>
          <p className="cr-desc">아클링스가 진행하는 프로젝트에 지원해 보세요.</p>
        </div>
      </section>

      <section className="cr-list">
        <div className="wrap">
          <div className="cr-tools">
            <div className="cr-toolbar pj-toolbar">
              <form className="cr-search" role="search" method="get" action="/projects">
                {filter.role && <input type="hidden" name="role" value={filter.role} />}
                {filter.status && <input type="hidden" name="status" value={filter.status} />}
                {filter.reward && <input type="hidden" name="reward" value={filter.reward} />}
                {filter.sort !== "latest" && <input type="hidden" name="sort" value={filter.sort} />}
                <label htmlFor="pj-q" className="sr-only">
                  공고 검색
                </label>
                <input id="pj-q" name="q" type="search" className="cr-input" defaultValue={filter.q} maxLength={MAX_QUERY} placeholder="제목이나 설명으로 찾기" autoComplete="off" />
                <button type="submit" className="btn btn-primary">
                  검색
                </button>
              </form>
              <details className="cr-filter">
                <summary className="btn btn-ghost">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 5h18M6 12h12M10 19h4" />
                  </svg>
                  필터{nFilters > 0 && <span className="cr-badge">{nFilters}</span>}
                </summary>
                <div className="cr-filter-panel" role="group" aria-label="조건으로 거르기">
                  <p className="cr-filter-title">역할</p>
                  <div className="cr-chips">
                    <Link href={href({ role: undefined, page: 1 })} className="cr-fchip" aria-current={filter.role ? undefined : "true"}>
                      전체
                    </Link>
                    {(Object.keys(ROLES) as (keyof typeof ROLES)[]).map((r) => (
                      <Link key={r} href={href({ role: r, page: 1 })} className="cr-fchip" aria-current={filter.role === r ? "true" : undefined}>
                        {ROLES[r]}
                      </Link>
                    ))}
                  </div>
                  <p className="cr-filter-title">모집 상태</p>
                  <div className="cr-chips">
                    <Link href={href({ status: undefined, page: 1 })} className="cr-fchip" aria-current={filter.status ? undefined : "true"}>
                      전체
                    </Link>
                    {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => (
                      <Link key={s} href={href({ status: s, page: 1 })} className="cr-fchip" aria-current={filter.status === s ? "true" : undefined}>
                        {STATUS_LABEL[s]}
                      </Link>
                    ))}
                  </div>
                  <p className="cr-filter-title">보상</p>
                  <div className="cr-chips">
                    <Link href={href({ reward: undefined, page: 1 })} className="cr-fchip" aria-current={filter.reward ? undefined : "true"}>
                      전체
                    </Link>
                    {(Object.keys(REWARD_LABEL) as (keyof typeof REWARD_LABEL)[]).map((r) => (
                      <Link key={r} href={href({ reward: r, page: 1 })} className="cr-fchip" aria-current={filter.reward === r ? "true" : undefined}>
                        {REWARD_LABEL[r]}
                      </Link>
                    ))}
                  </div>
                </div>
              </details>
              {/* 운영자에게만 보인다(isAdminUser). 예시 공고 올리기 화면으로 간다 */}
              {isAdmin && (
                <Link href="/projects/new" className="btn btn-primary pj-post">
                  공고 올리기 <span aria-hidden="true">＋</span>
                </Link>
              )}
              {isAdmin && (
                <Link href="/projects/mine" className="btn btn-ghost pj-post">
                  내 프로젝트
                </Link>
              )}
            </div>
          </div>

          <div className="pj-meta">
            <p className="pj-count">
              공고 <b>{total}</b>건
            </p>
            {chips.map((c) => (
              <Link key={c.key} href={c.off} className="pj-chip" aria-label={`${c.label} 조건 빼기`}>
                {c.label} <span aria-hidden="true">×</span>
              </Link>
            ))}
            {filtered && (
              <Link href={projectsHref({ sort: filter.sort })} className="cr-clear">
                조건 지우기
              </Link>
            )}
            <nav className="pj-sort" aria-label="정렬">
              {(Object.keys(SORT_LABEL) as ProjectSort[]).map((s, i) => (
                <span key={s} className="pj-sort-item">
                  {i > 0 && (
                    <span className="pj-sort-bar" aria-hidden="true">
                      |
                    </span>
                  )}
                  <Link href={href({ sort: s, page: 1 })} aria-current={filter.sort === s ? "true" : undefined}>
                    {SORT_LABEL[s]}
                  </Link>
                </span>
              ))}
            </nav>
          </div>

          {failed ? (
            <div className="panel cr-state" role="alert">
              <h2>공고를 불러오지 못했어요</h2>
              <p>잠시 뒤에 다시 열어 주세요.</p>
              <Link href="/projects" className="btn btn-ghost">
                다시 열기
              </Link>
            </div>
          ) : total === 0 ? (
            <div className="panel cr-state">
              <h2>{filtered ? "맞는 공고가 없어요" : "아직 모집 중인 공고가 없어요"}</h2>
              <p>{filtered ? "조건에 맞는 공고가 아직 없어요. 조건을 바꿔 보세요." : "새 공고가 올라오면 여기에 보여요."}</p>
              {filtered && (
                <Link href={projectsHref({ sort: filter.sort })} className="btn btn-ghost">
                  조건 지우기
                </Link>
              )}
            </div>
          ) : items.length === 0 ? (
            <div className="panel cr-state">
              <h2>이 쪽에는 공고가 없어요</h2>
              <p>마지막 쪽은 {pages}쪽이에요.</p>
              <Link href={href({ page: 1 })} className="btn btn-ghost">
                첫 쪽으로
              </Link>
            </div>
          ) : (
            <>
              <ul className="cr-grid">
                {items.map((p) => (
                  <li key={p.id}>
                    <ProjectCard p={p} today={today} bookmarked={marked.has(p.id)} loggedIn={loggedIn} />
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <nav className="pager" aria-label="쪽 이동">
                  {page > 1 ? (
                    <Link href={href({ page: page - 1 })} className="btn btn-ghost">
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
                    <Link href={href({ page: page + 1 })} className="btn btn-ghost">
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
