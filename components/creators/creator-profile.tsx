import Link from "next/link";
import { formatKstDate } from "@/lib/time";
import { RoleTags } from "./role-tags";
import type { CreatorProfileData, PlanCard } from "./types";
import "./creators.css";

const TONES = ["teal", "dusty", "sage"] as const;
// 프로필 원 색은 공개 주소 글자로 정해 같은 사람은 늘 같은 색이다.
function toneOf(handle: string): (typeof TONES)[number] {
  let n = 0;
  for (const ch of handle) n = (n * 31 + ch.charCodeAt(0)) % 1000003;
  return TONES[n % TONES.length];
}

// 크리에이터 프로필 화면(프로필 + 그 사람이 공개한 기획안). 데이터를 받기만 하고 읽지 않는다.
export function CreatorProfile({
  creator,
  plans,
  total,
  page,
  pages,
  backHref,
  planHref,
  pageHref,
}: {
  creator: CreatorProfileData;
  plans: PlanCard[];
  total: number;
  page: number;
  pages: number;
  backHref: string;
  planHref: (id: string) => string;
  pageHref: (page: number) => string;
}) {
  return (
    <div className="cr">
      <section className="cr-list cr-prof">
        <div className="wrap">
          <Link href={backHref} className="cr-back">
            ← 크리에이터
          </Link>

          <header className="cr-prof-head">
            <span className={`cr-av cr-av-lg ${toneOf(creator.handle)}`} aria-hidden="true">
              {creator.name.slice(0, 1)}
            </span>
            <div className="cr-prof-text">
              <h1 className="cr-prof-name">{creator.name}</h1>
              <RoleTags roles={creator.roles} />
              {creator.bio && <p className="cr-prof-bio">{creator.bio}</p>}
            </div>
          </header>

          <div className="cr-sec-head">
            <h2 className="cr-sec-title">포트폴리오</h2>
            {total > 0 && <span className="cr-count">기획안 {total}건</span>}
          </div>

          {total === 0 ? (
            <div className="panel cr-state">
              <h2>아직 올린 기획안이 없어요</h2>
              <p>공개한 기획안이 생기면 여기에 보여요.</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="panel cr-state">
              <h2>이 쪽에는 기획안이 없어요</h2>
              <p>마지막 쪽은 {pages}쪽이에요.</p>
              <Link href={pageHref(1)} className="btn btn-ghost">
                첫 쪽으로
              </Link>
            </div>
          ) : (
            <>
              <ul className="cr-grid">
                {plans.map((p) => (
                  <li key={p.id}>
                    <Link href={planHref(p.id)} className="panel cr-plan">
                      <div className="cr-box">
                        <span className="cr-label">로그라인</span>
                        <h3 className="cr-box-title">{p.title}</h3>
                        <p className="cr-box-logline">{p.logline}</p>
                      </div>
                      <span className="cr-plan-date">
                        게시일 <time dateTime={p.publishedAt}>{formatKstDate(p.publishedAt)}</time>
                      </span>
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
