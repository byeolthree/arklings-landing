import Link from "next/link";
import { ROLES } from "@/lib/collab";
import { activeCount, FORMATS, hasFilter, MAX_QUERY, type CreatorFilter } from "./filter";
import { GENRES } from "./genres";
import { BlurVideo } from "./blur-video";
import { RoleTags } from "./role-tags";
import { FORM_LABEL, type CreatorCard, type WorkForm } from "./types";
import "./creators.css";


// 협업 신청 아이콘(종이비행기)
function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
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
  applyHref,
  hiddenFields = {},
}: {
  cards: CreatorCard[];
  total: number;
  page: number;
  pages: number;
  filter: CreatorFilter;
  profileHref: (handle: string) => string;
  // 쪽·검색어·필터를 주소로 바꿔 주는 함수(1쪽이면 page를 생략한다)
  pageHref: (opts: Partial<CreatorFilter> & { page?: number }) => string;
  // 카드의 「협업 신청」이 가는 주소(받는 크리에이터와 역할을 미리 채워 준다)
  applyHref?: (c: CreatorCard) => string; // 안 주면 카드의 협업 신청 버튼을 숨긴다
  // 검색 폼이 함께 보내야 하는 다른 주소 값(예: 샘플 미리보기의 state)
  hiddenFields?: Record<string, string>;
}) {
  const filtered = hasFilter(filter);
  const nFilters = activeCount(filter);
  return (
    <div className="cr">
      <section className="cr-top">
        <div className="wrap">
          <h1 className="cr-title">포트폴리오 탐색</h1>
          <p className="cr-desc">카드를 눌러 크리에이터의 작품을 둘러보세요.</p>
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
                {filter.genre && <input type="hidden" name="genre" value={filter.genre} />}
                {filter.form && <input type="hidden" name="form" value={filter.form} />}
                {filter.open && <input type="hidden" name="open" value="1" />}
                {filter.fmt && <input type="hidden" name="fmt" value={filter.fmt} />}
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
                  placeholder="닉네임이나 작품으로 찾기"
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
                  필터{nFilters > 0 && <span className="cr-badge">{nFilters}</span>}
                </summary>
                <div className="cr-filter-panel" role="group" aria-label="조건으로 거르기">
                  <p className="cr-filter-title">역할</p>
                  <div className="cr-chips">
                    <Link href={pageHref({ ...filter, role: undefined })} className="cr-fchip" aria-current={filter.role ? undefined : "true"}>
                      전체
                    </Link>
                    {(Object.keys(ROLES) as (keyof typeof ROLES)[]).map((r) => (
                      <Link key={r} href={pageHref({ ...filter, role: r })} className="cr-fchip" aria-current={filter.role === r ? "true" : undefined}>
                        {ROLES[r]}
                      </Link>
                    ))}
                  </div>
                  <p className="cr-filter-title">포맷</p>
                  <div className="cr-chips">
                    <Link href={pageHref({ ...filter, fmt: undefined })} className="cr-fchip" aria-current={filter.fmt ? undefined : "true"}>
                      전체
                    </Link>
                    {FORMATS.map((f) => (
                      <Link key={f} href={pageHref({ ...filter, fmt: f })} className="cr-fchip" aria-current={filter.fmt === f ? "true" : undefined}>
                        {f}
                      </Link>
                    ))}
                  </div>
                  <p className="cr-filter-title">장르</p>
                  <div className="cr-chips">
                    <Link href={pageHref({ ...filter, genre: undefined })} className="cr-fchip" aria-current={filter.genre ? undefined : "true"}>
                      전체
                    </Link>
                    {GENRES.map((g) => (
                      <Link key={g} href={pageHref({ ...filter, genre: g })} className="cr-fchip" aria-current={filter.genre === g ? "true" : undefined}>
                        {g}
                      </Link>
                    ))}
                  </div>
                  <p className="cr-filter-title">롱폼 / 숏폼</p>
                  <div className="cr-chips">
                    <Link href={pageHref({ ...filter, form: undefined })} className="cr-fchip" aria-current={filter.form ? undefined : "true"}>
                      전체
                    </Link>
                    {(Object.keys(FORM_LABEL) as WorkForm[]).map((f) => (
                      <Link key={f} href={pageHref({ ...filter, form: f })} className="cr-fchip" aria-current={filter.form === f ? "true" : undefined}>
                        {FORM_LABEL[f]}
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
                {filter.q && nFilters > 0 ? " · " : ""}
                {[filter.genre, filter.form && FORM_LABEL[filter.form], filter.role && ROLES[filter.role], filter.fmt, filter.open && "협업 받는 중"].filter(Boolean).join(" · ")} 조건에 맞는 크리에이터가 아직 없어요.
              </p>
              <Link href={pageHref({})} className="btn btn-ghost">
                조건 지우기
              </Link>
            </div>
          ) : total === 0 ? (
            <div className="panel cr-state">
              <h2>아직 크리에이터가 없어요</h2>
              <p>작품을 포트폴리오에 올리면 크리에이터로 여기에 보여요.</p>
              <Link href="/planner" className="btn btn-primary">
                기획안 만들기 <span className="arrow">→</span>
              </Link>
              <Link href="/mypage" className="btn btn-ghost">
                크리에이터 프로필 만들기
              </Link>
            </div>
          ) : cards.length === 0 ? (
            <div className="panel cr-state">
              <h2>이 쪽에는 크리에이터가 없어요</h2>
              <p>마지막 쪽은 {pages}쪽이에요.</p>
              <Link href={pageHref({ ...filter })} className="btn btn-ghost">
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
                {cards.map((c) => {
                  // 탐색 카드(2026-11-13 시안 card11): 프로필 동그라미 없음, 협업 신청은 오른쪽 위 아이콘 버튼,
                  // 대표 콘텐츠는 좌우 끝까지 채운 칸(로그라인도 같은 높이) 왼쪽 위에 종류 글자(굵은 색 글자), 장르는 #글자.
                  const kindLabel = c.main === "media" ? c.mainSub : c.docLabel ?? "로그라인";
                  return (
                  <li key={c.workId ?? c.handle}>
                    <div className="panel cr-card cr-card-v2">
                      <div className="cr-v2-top">
                        <Link href={profileHref(c.handle)} className="cr-v2-who cr-stretch">
                          <span className="cr-name">{c.name}</span>
                          {c.bio && <span className="cr-bio">{c.bio}</span>}
                        </Link>
                        {c.openToCollab && applyHref && (
                          <Link href={applyHref(c)} className="cr-ask" aria-label={`${c.name}님에게 협업 신청`} title="협업 신청">
                            <SendIcon />
                          </Link>
                        )}
                      </div>
                      <Link href={profileHref(c.handle)} className="cr-card-main">
                        <RoleTags roles={c.roles} lead />
                        <div className={`cr-v2-main ${c.main}`}>
                          {c.main === "media" && c.hero ? (
                            c.hero === "video" && c.heroSrc ? (
                              <BlurVideo src={c.heroSrc} className="cr-main-media has-src" label="대표 영상" />
                            ) : c.hero === "image" && c.heroSrc ? (
                              // 대표 이미지: 등록 화면에서 고른 대로 꽉 채우거나(cover), 자르지 않고 남는 곳을 카드 배경색으로 둔다(contain)
                              <div className={`cr-main-media has-src cr-v2-img ${c.mainFit === "cover" ? "fit-cover" : "fit-contain"}`} role="img" aria-label="대표 이미지">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={c.heroSrc} alt="" loading="lazy" />
                              </div>
                            ) : (
                              <div className="cr-main-media" role="img" aria-label={c.hero === "video" ? "대표 영상" : "대표 이미지"}>
                                {c.hero === "video" ? "▶ 〈대표 영상〉" : "〈대표 이미지〉"}
                              </div>
                            )
                          ) : (
                            <div className="cr-box">
                              {/* 제목 · 종류를 한 줄로(밝은 칸이라 바탕 없음) */}
                              <p className="cr-v2-cap plain">
                                <span className="cr-v2-cap-t">{c.latest.title}</span>
                                <span className="cr-v2-cap-dot" aria-hidden="true">·</span>
                                <span className="cr-v2-cap-k">{c.docLabel ?? "로그라인"}</span>
                              </p>
                              <p className="cr-box-logline">{c.docLabel ? c.docText : c.latest.logline}</p>
                            </div>
                          )}
                          {/* 그림·영상 위: 제목 · 종류를 한 줄로, 그 줄 뒤에만 반투명한 어두운 둥근 바탕(2026-11-13 아키텍터 참고 그림) */}
                          {c.main === "media" && (c.latest.title || kindLabel) && (
                            <p className="cr-v2-cap">
                              {c.latest.title && <span className="cr-v2-cap-t">{c.latest.title}</span>}
                              {c.latest.title && kindLabel && <span className="cr-v2-cap-dot" aria-hidden="true">·</span>}
                              {kindLabel && <span className="cr-v2-cap-k">{kindLabel}</span>}
                            </p>
                          )}
                        </div>
                        {c.latest.genres && c.latest.genres.length > 0 && (
                          <ul className="cr-genres cr-genres-hash" aria-label="장르">
                            {c.latest.genres.map((g) => (
                              <li key={g}>#{g}</li>
                            ))}
                          </ul>
                        )}
                      </Link>
                    </div>
                  </li>
                  );
                })}
              </ul>
              {pages > 1 && (
                <nav className="pager" aria-label="쪽 이동">
                  {page > 1 ? (
                    <Link href={pageHref({ ...filter, page: page - 1 })} className="btn btn-ghost">
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
                    <Link href={pageHref({ ...filter, page: page + 1 })} className="btn btn-ghost">
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
