import type { Metadata } from "next";
import Link from "next/link";
import { listPortfolio, PORTFOLIO_PAGE_SIZE } from "@/lib/portfolio";
import { formatKstDate } from "@/lib/time";
import "@/components/portfolio/portfolio.css";

export const metadata: Metadata = { title: "포트폴리오", description: "아클링스에서 완성해 공개한 시리즈 기획안을 둘러보세요." };
export const dynamic = "force-dynamic"; // 공개를 끄면 바로 목록에서 빠지도록 열 때마다 새로 읽는다

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PortfolioListPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1);
  const { cards, total } = await listPortfolio(page);
  const pages = Math.max(1, Math.ceil(total / PORTFOLIO_PAGE_SIZE));
  const href = (p: number) => (p > 1 ? `/portfolio?page=${p}` : "/portfolio");

  return (
    <div className="pf">
      <section className="pf-top">
        <div className="wrap">
          <p className="kicker">아클링스 포트폴리오</p>
          <h1 className="ctr-title">완성된 기획안을 둘러보세요</h1>
          <p className="sec-desc">크리에이터들이 아클링스에서 완성해 올린 시리즈 기획안이에요.</p>
        </div>
      </section>

      <section className="pf-list">
        <div className="wrap narrow">
          {total === 0 ? (
            <div className="panel pf-state">
              <h2>아직 올라온 기획안이 없어요</h2>
              <p>기획안을 완성해 포트폴리오에 올리면 여기에 보여요.</p>
              <Link href="/planner" className="btn btn-primary">
                기획안 만들기 <span className="arrow">→</span>
              </Link>
            </div>
          ) : cards.length === 0 ? (
            <div className="panel pf-state">
              <h2>이 쪽에는 기획안이 없어요</h2>
              <p>마지막 쪽은 {pages}쪽이에요.</p>
              <Link href="/portfolio" className="btn btn-ghost">
                첫 쪽으로
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 text-[13px]">총 {total}개</p>
              <ul className="pf-grid">
                {cards.map((c) => (
                  <li key={c.id}>
                    <Link href={`/portfolio/${c.id}`} className="panel pf-card">
                      <span className="pf-label">로그라인</span>
                      <h2 className="pf-card-title">{c.title}</h2>
                      <p className="pf-card-logline">{c.logline}</p>
                      <div className="pf-meta">
                        <span className="pf-av" aria-hidden="true">{c.authorName.slice(0, 1)}</span>
                        <span className="name">{c.authorName}</span>
                        <span className="sep" aria-hidden="true">·</span>
                        <span>
                          게시일 <time dateTime={c.publishedAt}>{formatKstDate(c.publishedAt)}</time>
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <nav className="pager" aria-label="쪽 이동">
                  {page > 1 ? <Link href={href(page - 1)} className="btn btn-ghost">← 이전</Link> : <span className="btn btn-ghost off" aria-hidden="true">← 이전</span>}
                  <span className="now">{page} / {pages}</span>
                  {page < pages ? <Link href={href(page + 1)} className="btn btn-ghost">다음 →</Link> : <span className="btn btn-ghost off" aria-hidden="true">다음 →</span>}
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
