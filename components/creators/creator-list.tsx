import Link from "next/link";
import { ROLES } from "@/lib/collab";
import type { CreatorCard } from "./types";
import "./creators.css";

const MAX_ROLES = 3;

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
  profileHref,
  pageHref,
}: {
  cards: CreatorCard[];
  total: number;
  page: number;
  pages: number;
  profileHref: (handle: string) => string;
  pageHref: (page: number) => string;
}) {
  return (
    <div className="cr">
      <section className="cr-list">
        <div className="wrap">
          <div className="cr-head">
            <h1 className="cr-label-top">크리에이터-포트폴리오 탐색</h1>
            {total > 0 && <span className="cr-count">총 {total}명</span>}
          </div>
          {total === 0 ? (
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
              <Link href={pageHref(1)} className="btn btn-ghost">
                첫 쪽으로
              </Link>
            </div>
          ) : (
            <>
              <ul className="cr-grid">
                {cards.map((c) => (
                  <li key={c.handle}>
                    <Link href={profileHref(c.handle)} className="panel cr-card">
                      <div className="cr-who">
                        <span className="cr-av" aria-hidden="true">
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
                      <span className="cr-chip">기획안 {c.planCount}건</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <nav className="pager" aria-label="쪽 이동">
                  {page > 1 ? (
                    <Link href={pageHref(page - 1)} className="btn btn-ghost">
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
                    <Link href={pageHref(page + 1)} className="btn btn-ghost">
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
