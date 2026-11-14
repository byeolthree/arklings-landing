import Link from "next/link";
import { CopyLinkButton } from "@/components/portfolio/copy-link-button";
import { formatKstDate } from "@/lib/time";
import { RoleTags } from "./role-tags";
import type { PlanDetailData } from "./types";
import "./creators.css";

const TONES = ["teal", "dusty", "sage"] as const;
function toneOf(key: string): (typeof TONES)[number] {
  let n = 0;
  for (const ch of key) n = (n * 31 + ch.charCodeAt(0)) % 1000003;
  return TONES[n % TONES.length];
}

// 기획안 상세 화면. 제목 띠 없이 바로 기획안을 보여 준다. 데이터를 받기만 하고 읽지 않는다.
export function PlanDetail({
  plan,
  listHref,
  profileHref,
  applyHref,
}: {
  plan: PlanDetailData;
  listHref: string;
  // 작성자 프로필 주소를 만들어 주는 함수(프로필을 안 만든 작성자는 plan.authorHandle이 없어 쓰지 않는다)
  profileHref: (handle: string) => string;
  applyHref: string;
}) {
  const authorHref = plan.authorHandle ? profileHref(plan.authorHandle) : undefined;
  const author = (
    <>
      <span className={`cr-av cr-av-sm ${toneOf(plan.authorHandle ?? plan.authorName)}`} aria-hidden="true">
        {plan.authorName.slice(0, 1)}
      </span>
      <span className="cr-d-author">{plan.authorName}</span>
    </>
  );

  return (
    <div className="cr">
      <section className="cr-list cr-prof">
        <div className="wrap cr-narrow">
          <Link href={authorHref ?? listHref} className="cr-back">
            {authorHref ? `← ${plan.authorName}의 포트폴리오` : "← 크리에이터"}
          </Link>

          <header className="cr-d-head">
            <h1 className="cr-d-title">{plan.title}</h1>
            <div className="cr-d-meta">
              {authorHref ? (
                <Link href={authorHref} className="cr-d-who">
                  {author}
                </Link>
              ) : (
                <span className="cr-d-who">{author}</span>
              )}
              <span className="cr-d-date">
                게시일 <time dateTime={plan.publishedAt}>{formatKstDate(plan.publishedAt)}</time>
              </span>
            </div>
            {plan.authorRoles && plan.authorRoles.length > 0 && <RoleTags roles={plan.authorRoles} />}
          </header>

          <article className="panel cr-doc">
            {plan.content.sections.map((s) => (
              <div key={s.id}>
                <h2 className="cr-label">{s.label}</h2>
                <p className="cr-logline">{s.text}</p>
              </div>
            ))}
            {plan.content.answers.length > 0 && (
              <dl className="cr-sheet">
                {plan.content.answers.map((a) => (
                  <div key={a.label} className="cr-sheet-row">
                    <dt>{a.label}</dt>
                    <dd>{a.text}</dd>
                  </div>
                ))}
              </dl>
            )}
          </article>

          <div className="cr-actions">
            {/* 받는 사람은 서버가 기획안 번호로 주인을 찾아 정한다. 주소에는 기획안 번호만 싣는다. */}
            <Link href={applyHref} className="btn btn-primary">
              이 기획안에 협업 신청 <span className="arrow">→</span>
            </Link>
            <CopyLinkButton />
            <p className="cr-note">신청은 {plan.authorName}님께 전달돼요. 로그인하지 않아도 보낼 수 있어요.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
