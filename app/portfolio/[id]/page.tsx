import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CopyLinkButton } from "@/components/portfolio/copy-link-button";
import { UUID_RE } from "@/lib/collab";
import { getPortfolio } from "@/lib/portfolio";
import { formatKstDate } from "@/lib/time";
import "@/components/portfolio/portfolio.css";

export const dynamic = "force-dynamic"; // 공개를 끄거나 지우면 바로 404가 되도록 열 때마다 새로 읽는다

type Props = { params: Promise<{ id: string }> };

// 제목(metadata)과 본문이 같은 요청 안에서 한 번만 읽도록
const load = cache(async (id: string) => (UUID_RE.test(id) ? getPortfolio(id) : null));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const plan = await load((await params).id);
  return plan ? { title: `${plan.title} · 포트폴리오`, description: plan.logline.slice(0, 120) } : { title: "찾을 수 없는 기획안" };
}

export default async function PortfolioDetailPage({ params }: Props) {
  const plan = await load((await params).id);
  if (!plan) notFound();

  return (
    <div className="pf">
      <section className="pf-top">
        <div className="wrap narrow">
          <Link href="/portfolio" className="pf-back">← 포트폴리오</Link>
          <div className="pf-head">
            <span className="live"><i aria-hidden="true" />게시 중</span>
            <h1 className="pf-title">{plan.title}</h1>
            <div className="pf-meta">
              <span className="pf-av" aria-hidden="true">{plan.authorName.slice(0, 1)}</span>
              <span className="name">{plan.authorName}</span>
              <span className="sep" aria-hidden="true">·</span>
              <span>
                게시일 <time dateTime={plan.publishedAt}>{formatKstDate(plan.publishedAt)}</time>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="pf-detail-body">
        <div className="wrap narrow">
          <article className="panel pf-doc">
            {plan.content.sections.map((s) => (
              <div key={s.id}>
                <h2 className="pf-label">{s.label}</h2>
                <p className="pf-logline">{s.text}</p>
              </div>
            ))}
            {plan.content.answers.length > 0 && (
              <dl className="pf-sheet">
                {plan.content.answers.map((a) => (
                  <div key={a.label} className="sheet-row">
                    <dt>{a.label}</dt>
                    <dd>{a.text}</dd>
                  </div>
                ))}
              </dl>
            )}
          </article>

          <div className="pf-actions">
            {/* 1단계: 협업 신청 연결(받는 사람 = 기획안 주인)은 2단계에서 붙인다. */}
            <span className="btn btn-primary" aria-disabled="true">이 기획안에 협업 신청</span>
            <CopyLinkButton />
            <p className="note">협업 신청 버튼은 다음 단계에서 연결돼요.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
