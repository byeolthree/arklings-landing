import type { Metadata } from "next";
import Link from "next/link";
import "@/components/creators/creators.css";
import "@/components/flow/flow.css";
import { RoleTags } from "@/components/creators/role-tags";
import { FlowHelper } from "@/components/flow/flow-helper";
import { applyHref, creatorOf } from "@/components/flow/sample";
import { ROLES, type Role } from "@/lib/collab";

// 디자인 확인용 샘플 미리보기(협업 신청 흐름 6단계). 킹덤 화면은 아직 없어서, 작품 화면의 「참여 크리에이터와 역할」 부분만 작게 만든 샘플이다.
// 이름은 프로필로, 옆 버튼은 협업 신청서(받는 사람·역할 미리 채움)로 잇는다.
export const metadata: Metadata = { title: "킹덤 작품 화면 흐름 샘플", robots: { index: false, follow: false } };

const CAST: { handle: string; role: Role }[] = [
  { handle: "jian-lee", role: "script" },
  { handle: "seoha-park", role: "video" },
  { handle: "hana-kang", role: "art_director" },
  { handle: "dayun-choi", role: "history_advisor" },
];

export default function FlowKingdomPage() {
  return (
    <>
      <FlowHelper />
      <div className="cr">
        <section className="cr-top">
          <div className="wrap">
            <h1 className="cr-title">〈작품 제목〉</h1>
            <p className="cr-desc">〈작품 소개〉</p>
          </div>
        </section>
        <section className="cr-list">
          <div className="wrap">
            <div className="cr-sec-head">
              <h2 className="cr-sec-title">참여 크리에이터와 역할</h2>
            </div>
            <ul className="fl-rows">
              {CAST.map((m) => {
                const c = creatorOf(m.handle)!;
                return (
                  <li key={m.handle} className="panel fl-row">
                    <div className="fl-row-top">
                      <h3>
                        <Link href={`/dev-preview/flow/creators/${c.handle}`}>{c.name}</Link>
                      </h3>
                      <span className="fl-meta">{ROLES[m.role]}</span>
                    </div>
                    <RoleTags roles={[m.role]} />
                    {c.open ? (
                      <div className="fl-acts">
                        <Link href={applyHref(c.handle, { role: m.role })} className="btn btn-primary">협업 신청</Link>
                      </div>
                    ) : (
                      <p className="fl-meta">지금은 협업 신청을 받지 않아요.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
