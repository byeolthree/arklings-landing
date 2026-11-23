import Link from "next/link";
import { ROLES } from "@/lib/collab";
import { ROLE_TONE } from "../creators/role-tone";
import "../creators/creators.css";
import "./projects.css";
import { BookmarkButton, ProjectCard, StatusBadge } from "./project-card";
import { daysUntil, dday, monthDay, rewardText } from "./filter";
import { SOURCE_LABEL, type Project } from "./types";

// 「지원하기」: 모양만 둔다. 지원 처리(DB·함수)는 다음 단계에서 만든다.
function ApplyButton({ className }: { className: string }) {
  return (
    <button type="button" className={className}>
      지원하기 <span aria-hidden="true">→</span>
    </button>
  );
}

const ymd = (s: string) => `${parseInt(s.slice(5, 7), 10)}월 ${parseInt(s.slice(8, 10), 10)}일`;

// 프로젝트 상세. 위에서 아래로: 대표 칸 → 정보 카드 → 하는 일 → 일정 띠 → 연결 작품 → 지원 띠 → 추천 프로젝트
export function ProjectDetail({ p, related, today }: { p: Project; related: Project[]; today: string }) {
  const days = daysUntil(p.deadline, today);
  const deadlineBig = p.status === "open" ? dday(days) : p.status === "soon" ? "모집 전" : "마감";
  const deadlineSub = p.status === "soon" ? `${monthDay(p.opensAt)} 모집 시작` : monthDay(p.deadline);
  const ctaNote = p.status === "open" ? `${monthDay(p.deadline)}까지 받습니다. 지원서에는 포트폴리오를 함께 고릅니다.` : p.status === "soon" ? `${monthDay(p.opensAt)}부터 받습니다.` : "모집이 마감되었습니다.";

  return (
    <div className="cr pj">
      {/* (가) 대표 칸: 어두운 이미지 칸, 높이 520px */}
      <section className="cr-hero pj-hero">
        <div className="cr-hero-media" aria-hidden="true">
          {p.heroNote}
        </div>
        <div className="wrap cr-hero-over">
          <Link href="/projects" className="cr-back">
            ← 프로젝트 목록
          </Link>
          <div className="pj-hero-body">
            <div className="pj-hero-main">
              <div className="pj-hero-meta">
                <StatusBadge status={p.status} />
                <span>
                  {SOURCE_LABEL[p.source]} · {ymd(p.postedAt)} 올림
                </span>
              </div>
              <h1 className="pj-hero-title">{p.title}</h1>
              <ul className="pj-hero-tags" aria-label="역할과 장르">
                {p.roles.map((r) => (
                  <li key={r} className={`pj-hero-role ${ROLE_TONE[r]}`}>
                    {ROLES[r]}
                  </li>
                ))}
                {p.genres.map((g) => (
                  <li key={g} className="pj-hero-genre">
                    #{g}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pj-hero-act">
              <ApplyButton className="btn btn-primary" />
              <BookmarkButton onDark />
            </div>
          </div>
        </div>
      </section>

      {/* (나) 대표 칸 아래쪽에 걸친 흰 카드: 보상·모집 마감·작업 기간·지원자 */}
      <div className="wrap pj-statswrap">
        <dl className="pj-stats">
          <div>
            <dt>보상</dt>
            <dd>{rewardText(p)}</dd>
            <span>AI 단가 분석 기준</span>
          </div>
          <div>
            <dt>모집 마감</dt>
            <dd>{deadlineBig}</dd>
            <span>{deadlineSub}</span>
          </div>
          <div>
            <dt>작업 기간</dt>
            <dd>{p.periodLabel}</dd>
            <span>{p.periodRange}</span>
          </div>
          <div>
            <dt>지원자</dt>
            <dd>{p.status === "soon" ? "모집 전" : `${p.applicants}명`}</dd>
            <span>선정 {p.selected}명</span>
          </div>
        </dl>
      </div>

      {/* (다) 하는 일: 왼쪽 소개 글, 오른쪽 번호 붙인 작업 범위 카드 */}
      <section className="pj-sec">
        <div className="wrap pj-two">
          <div className="pj-intro">
            <p className="pj-eyebrow">하는 일</p>
            <h2 className="pj-h2">
              {p.intro.heading.split("\n").map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </h2>
            <p className="pj-body">{p.intro.body}</p>
          </div>
          <div className="panel pj-scope">
            <p className="pj-eyebrow">작업 범위</p>
            <ol>
              {p.scope.map((s, i) => (
                <li key={s.title}>
                  <span className="pj-num">{i + 1}</span>
                  <div>
                    <b>{s.title}</b>
                    <span>{s.text}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* (라) 청록 띠: 일정 4단계를 가로 흐름으로 */}
      <section className="cr-band tint">
        <div className="wrap pj-flow">
          <div className="pj-flow-head">
            <p className="pj-eyebrow">일정</p>
            <h2 className="pj-h2">모집부터 공개까지</h2>
          </div>
          <ol className="pj-steps">
            {p.steps.map((s, i) => (
              <li key={s.label} className={i <= p.currentStep ? "now" : undefined} aria-current={i === p.currentStep ? "step" : undefined}>
                <span className="pj-dot" aria-hidden="true" />
                <b>{s.label}</b>
                <span>{s.range}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* (마) 연결 작품: 로그라인 칸과 「작품 보기」 */}
      <section className="pj-sec">
        <div className="wrap pj-two pj-work">
          <div className="pj-intro">
            <p className="pj-eyebrow">연결 작품</p>
            <h2 className="pj-h2">「{p.work.title}」</h2>
            <p className="pj-body sm">{p.work.blurb}</p>
            <div>
              <Link href="/creators" className="btn btn-ghost">
                작품 보기 <span className="arrow">→</span>
              </Link>
            </div>
          </div>
          <div className="pj-logline">
            <p className="pj-logline-head">
              <b className="pj-serif">{p.work.title}</b>
              <span aria-hidden="true">·</span>
              <b className="pj-kind">로그라인</b>
            </p>
            <p>{p.work.logline}</p>
          </div>
        </div>
      </section>

      {/* (바) 자주 띠: 마감 안내와 흰 「지원하기」 */}
      <section className="wrap pj-ctawrap">
        <div className="pj-cta">
          <div>
            <b>{p.status === "closed" ? "이 프로젝트는 모집이 끝났어요" : "이 프로젝트에 지원하시겠어요?"}</b>
            <span>{ctaNote}</span>
          </div>
          <ApplyButton className="pj-cta-btn" />
        </div>
      </section>

      {/* (사) 추천 프로젝트 카드 3장 */}
      <section className="pj-rec">
        <div className="wrap">
          <div className="pj-rec-head">
            <h2>추천 프로젝트</h2>
            <Link href="/projects" className="cr-clear">
              전체 보기
            </Link>
          </div>
          <ul className="cr-grid">
            {related.map((r) => (
              <li key={r.id}>
                <ProjectCard p={r} today={today} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
