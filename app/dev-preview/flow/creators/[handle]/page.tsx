import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@/components/creators/creators.css";
import "@/components/flow/flow.css";
import { CopyLinkButton } from "@/components/portfolio/copy-link-button";
import { RoleTags } from "@/components/creators/role-tags";
import { FlowHelper } from "@/components/flow/flow-helper";
import { applyHref, creatorOf, FORMATS, isPlanKind, itemOf, KINDS, kindCounts } from "@/components/flow/sample";

// 디자인 확인용 샘플 미리보기(협업 신청 흐름 2·3단계: 프로필과 그 위에 열리는 기획안·작업물 창).
export const metadata: Metadata = { title: "크리에이터 프로필 흐름 샘플", robots: { index: false, follow: false } };

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function FlowProfilePage({ params, searchParams }: Props) {
  const { handle } = await params;
  const sp = await searchParams;
  const c = creatorOf(handle);
  if (!c) notFound();
  const item = itemOf(c, one(sp.item));
  const base = `/dev-preview/flow/creators/${handle}`;
  const mediaLabel = item?.kind === "image" ? "〈이미지〉" : item?.kind === "video" || item?.kind === "pitchvideo" ? "〈영상〉" : "〈문서〉";

  return (
    <>
      <FlowHelper />
      <div className="cr">
        <section className="cr-list cr-prof">
          <div className="wrap">
            <Link href="/dev-preview/flow/creators" className="cr-back">← 크리에이터</Link>

            <header className="cr-prof-head">
              <div className="cr-prof-text">
                <h1 className="cr-prof-name">{c.name}</h1>
                <RoleTags roles={c.roles} />
                <ul className="cr-genres" aria-label="장르">
                  {c.genres.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
                {c.about && <p className="cr-prof-bio">{c.about}</p>}
                {c.channels.length > 0 && (
                  <ul className="cr-chan" aria-label="채널 링크">
                    {c.channels.map((ch) => (
                      <li key={ch.label}>
                        <a href={ch.url} target="_blank" rel="noopener noreferrer">{ch.label} ↗</a>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="fl-sumline">{kindCounts(c).map((k) => `${KINDS[k.kind]} ${k.n}`).join(" · ")}</p>
                {c.open && <span className="cr-open">협업 신청 받는 중</span>}
              </div>
            </header>

            <div className="cr-sec-head">
              <h2 className="cr-sec-title">포트폴리오</h2>
              <span className="cr-count">{c.items.length}건</span>
            </div>
            <ul className="fl-items">
              {c.items.map((x) => (
                <li key={x.id}>
                  <Link href={`${base}?item=${x.id}`} className="fl-item" scroll={false}>
                    <span className="fl-badge">{KINDS[x.kind]}</span>
                    <span className="fl-item-title">{x.title}</span>
                    <ul className="cr-genres" aria-label="장르">
                      {x.genres.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                    <span className="fl-fmt">{FORMATS[x.format]}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="fl-after" />
          </div>
        </section>

        {/* 스크롤해도 화면 아래에 붙어 있는 협업 신청 */}
        <div className="fl-bar">
          {c.open ? (
            <Link href={applyHref(c.handle, { role: c.roles[0] })} className="btn btn-primary">
              이 크리에이터에게 협업 신청 <span className="arrow">→</span>
            </Link>
          ) : (
            <span className="fl-meta">지금은 협업 신청을 받지 않아요.</span>
          )}
        </div>
      </div>

      {item && (
        <div className="cr cr-win-back">
          <div className="cr-win" role="dialog" aria-modal="true" aria-labelledby="fl-win-h">
            <Link href={base} className="btn btn-ghost cr-win-close" scroll={false}>닫기</Link>
            <header>
              <p className="fl-badge" style={{ display: "inline-block" }}>{KINDS[item.kind]}</p>
              <h1 id="fl-win-h" className="cr-win-title" style={{ marginTop: 10 }}>{item.title}</h1>
              <p className="cr-win-by">{c.name} · {FORMATS[item.format]}</p>
              <ul className="cr-genres cr-win-genres" aria-label="장르">
                {item.genres.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </header>
            {item.kind === "logline" ? (
              <div className="cr-w-box">
                <h2 className="cr-label">로그라인</h2>
                <p>{item.text}</p>
              </div>
            ) : (
              <div className={`cr-w-media${mediaLabel === "〈문서〉" ? " doc" : ""}`}>{mediaLabel}</div>
            )}
            <div className="cr-actions">
              {c.open ? (
                <Link href={applyHref(c.handle, { plan: item.id, role: c.roles[0] })} className="btn btn-primary">
                  {isPlanKind(item.kind) ? "이 기획안으로 협업 신청" : "이 작업물로 협업 신청"} <span className="arrow">→</span>
                </Link>
              ) : (
                <span className="fl-meta">지금은 협업 신청을 받지 않아요.</span>
              )}
              <CopyLinkButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
