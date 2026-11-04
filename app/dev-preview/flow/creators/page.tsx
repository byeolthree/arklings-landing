import type { Metadata } from "next";
import Link from "next/link";
import "@/components/creators/creators.css";
import "@/components/flow/flow.css";
import { RoleTags } from "@/components/creators/role-tags";
import { GENRES } from "@/components/creators/genres";
import { FlowHelper } from "@/components/flow/flow-helper";
import { applyHref, FLOW_CREATORS, FORMATS, KINDS, kindCounts, type Format } from "@/components/flow/sample";
import { ROLES, type Role } from "@/lib/collab";

// 디자인 확인용 샘플 미리보기(협업 신청 흐름 1단계). 실제 DB와 연결되지 않고, 디자인이 끝나면 지운다.
export const metadata: Metadata = { title: "크리에이터 목록 흐름 샘플", robots: { index: false, follow: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function FlowCreatorsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const genre = GENRES.includes(one(sp.genre) ?? "") ? one(sp.genre) : undefined;
  const format = one(sp.format) === "long" || one(sp.format) === "short" ? (one(sp.format) as Format) : undefined;
  const role = one(sp.role) && one(sp.role)! in ROLES ? (one(sp.role) as Role) : undefined;
  const open = one(sp.open) === "1";

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next: Record<string, string | undefined> = { genre, format, role, open: open ? "1" : undefined, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const s = p.toString();
    return `/dev-preview/flow/creators${s ? `?${s}` : ""}`;
  };

  const list = FLOW_CREATORS.filter(
    (c) => (!genre || c.genres.includes(genre)) && (!format || c.formats.includes(format)) && (!role || c.roles.includes(role)) && (!open || c.open),
  );

  return (
    <>
      <FlowHelper />
      <div className="cr">
        <section className="cr-top">
          <div className="wrap">
            <h1 className="cr-title">크리에이터 — 포트폴리오 탐색</h1>
            <p className="cr-desc">크리에이터를 눌러 프로필과 공개한 기획안을 둘러보세요.</p>
          </div>
        </section>

        <section className="cr-list">
          <div className="wrap">
            <div className="panel fl-filter" role="group" aria-label="걸러 보기">
              <div className="fl-frow">
                <span className="fl-flabel">장르</span>
                <div className="cr-chips">
                  <Link href={href({ genre: undefined })} className="cr-fchip" aria-current={genre ? undefined : "true"}>전체</Link>
                  {GENRES.map((g) => (
                    <Link key={g} href={href({ genre: g })} className="cr-fchip" aria-current={genre === g ? "true" : undefined}>{g}</Link>
                  ))}
                </div>
              </div>
              <div className="fl-frow">
                <span className="fl-flabel">롱폼/숏폼</span>
                <div className="cr-chips">
                  <Link href={href({ format: undefined })} className="cr-fchip" aria-current={format ? undefined : "true"}>전체</Link>
                  {(Object.keys(FORMATS) as Format[]).map((f) => (
                    <Link key={f} href={href({ format: f })} className="cr-fchip" aria-current={format === f ? "true" : undefined}>{FORMATS[f]}</Link>
                  ))}
                </div>
              </div>
              <div className="fl-frow">
                <span className="fl-flabel">역할</span>
                <div className="cr-chips">
                  <Link href={href({ role: undefined })} className="cr-fchip" aria-current={role ? undefined : "true"}>전체</Link>
                  {(Object.keys(ROLES) as Role[]).map((r) => (
                    <Link key={r} href={href({ role: r })} className="cr-fchip" aria-current={role === r ? "true" : undefined}>{ROLES[r]}</Link>
                  ))}
                </div>
              </div>
              <div className="fl-frow">
                <span className="fl-flabel">협업</span>
                <div className="cr-chips">
                  <Link href={href({ open: open ? undefined : "1" })} className="cr-fchip" aria-current={open ? "true" : undefined}>협업 받는 중</Link>
                </div>
              </div>
            </div>

            {list.length === 0 ? (
              <div className="panel cr-state">
                <h2>맞는 크리에이터가 없어요</h2>
                <p>조건에 맞는 크리에이터가 아직 없어요.</p>
                <Link href="/dev-preview/flow/creators" className="btn btn-ghost">조건 지우기</Link>
              </div>
            ) : (
              <>
                <p className="cr-count">{genre || format || role || open ? "검색 결과" : "총"} {list.length}명</p>
                <ul className="cr-grid">
                  {list.map((c) => (
                    <li key={c.handle}>
                      <article className="panel fl-card">
                        <div className="fl-name-row">
                          <h2 className="fl-name">
                            <Link href={`/dev-preview/flow/creators/${c.handle}`}>{c.name}</Link>
                          </h2>
                          {c.open && <span className="fl-open">협업 받는 중</span>}
                        </div>
                        <RoleTags roles={c.roles} />
                        <ul className="cr-genres" aria-label="장르">
                          {c.genres.map((g) => (
                            <li key={g}>{g}</li>
                          ))}
                        </ul>
                        <ul className="fl-kinds" aria-label="기획안 종류">
                          {kindCounts(c).map((k) => (
                            <li key={k.kind}>
                              {KINDS[k.kind]} {k.n}
                            </li>
                          ))}
                        </ul>
                        {c.open && (
                          <Link href={applyHref(c.handle, { role: role && c.roles.includes(role) ? role : c.roles[0] })} className="btn btn-primary">
                            협업 신청
                          </Link>
                        )}
                      </article>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
