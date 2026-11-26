import Link from "next/link";
import { ROLES } from "@/lib/collab";
import { APPLICATION_LABEL, rewardLabel, type ApplicationStatus } from "@/lib/projects";
import { ROLE_TONE } from "../creators/role-tone";
import "../creators/creators.css";
import "./projects.css";
import { BookmarkButton } from "./bookmark-button";
import { ProjectCard, StatusBadge } from "./project-card";
import { daysUntil, dday, monthDay } from "./filter";
import { SOURCE_LABEL, type Project } from "./types";

// 「지원하기」: 모집 중이고 아직 지원하지 않았을 때만 지원 화면으로 간다. 지원했으면 내 지원 상태(접수·수락·거절)를 보이고, 모집 전·마감이면 눌리지 않는다.
function ApplyButton({ className, p, myStatus }: { className: string; p: Project; myStatus: ApplicationStatus | null }) {
  if (myStatus) {
    return (
      <button type="button" className={className} disabled>
        {myStatus === "received" ? "지원 완료" : myStatus === "accepted" ? "수락됨" : "거절됨"} {myStatus !== "rejected" && <span aria-hidden="true">✓</span>}
      </button>
    );
  }
  if (p.status !== "open") {
    return (
      <button type="button" className={className} disabled>
        {p.status === "soon" ? "모집 전" : "모집 마감"}
      </button>
    );
  }
  return (
    <Link href={`/projects/${p.id}/apply`} className={className}>
      지원하기 <span aria-hidden="true">→</span>
    </Link>
  );
}

const ymd = (s: string) => `${parseInt(s.slice(5, 7), 10)}월 ${parseInt(s.slice(8, 10), 10)}일`;

// 작업 기간 칸: 시작·끝이 다 있으면 「N주」와 날짜, 하나만 있으면 그 날짜, 없으면 「협의」
function periodCell(p: Project): { big: string; sub: string } {
  if (p.workStartsOn && p.workEndsOn) {
    const days = Math.round((Date.parse(`${p.workEndsOn}T00:00:00Z`) - Date.parse(`${p.workStartsOn}T00:00:00Z`)) / 86400000) + 1;
    return { big: `${Math.max(1, Math.ceil(days / 7))}주`, sub: `${monthDay(p.workStartsOn)} ~ ${monthDay(p.workEndsOn)}` };
  }
  if (p.workStartsOn) return { big: "협의", sub: `${monthDay(p.workStartsOn)} 시작` };
  if (p.workEndsOn) return { big: "협의", sub: `${monthDay(p.workEndsOn)}까지` };
  return { big: "협의", sub: "지원 때 조율해요" };
}

// 프로젝트 상세. 위에서 아래로: 대표 칸 → 정보 카드 → 하는 일 → 연결 작품 → 지원 띠 → 추천 프로젝트
// (DB에 칸이 없는 「작업 범위」·「일정 4단계」·연결 작품의 소개·로그라인·대표 이미지는 화면에서 뺐다. 2026-11-26)
export function ProjectDetail({
  p,
  related,
  today,
  myStatus,
  bookmarked,
  bookmarkedIds,
  loggedIn,
  isAdmin,
}: {
  p: Project;
  related: Project[];
  today: string;
  myStatus: ApplicationStatus | null;
  bookmarked: boolean;
  bookmarkedIds: string[];
  loggedIn: boolean;
  isAdmin: boolean;
}) {
  const days = daysUntil(p.deadline, today);
  const deadlineBig = p.status === "open" ? dday(days) : p.status === "soon" ? "모집 전" : "마감";
  const deadlineSub = p.status === "soon" ? `${monthDay(p.opensAt)} 모집 시작` : monthDay(p.deadline);
  const period = periodCell(p);
  const marked = new Set(bookmarkedIds);
  const ctaNote = myStatus
    ? `내 지원 상태는 「${APPLICATION_LABEL[myStatus]}」이에요. 결과는 알림으로 알려 드려요.`
    : p.status === "open"
      ? `${monthDay(p.deadline)}까지 받습니다. 지원서에는 포트폴리오를 함께 고릅니다.`
      : p.status === "soon"
        ? `${monthDay(p.opensAt)}부터 받습니다.`
        : "모집이 마감되었습니다.";

  return (
    <div className="cr pj">
      {/* (가) 대표 칸: 어두운 칸, 높이 520px. 대표 이미지 칸은 DB에 없어서 바탕만 둔다 */}
      <section className="cr-hero pj-hero">
        <div className="cr-hero-media" aria-hidden="true" />
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
              <ApplyButton className="btn btn-primary" p={p} myStatus={myStatus} />
              <BookmarkButton projectId={p.id} title={p.title} initial={bookmarked} loggedIn={loggedIn} onDark />
              {isAdmin && (
                <Link href={`/projects/${p.id}/manage`} className="btn pj-hero-manage">
                  지원자 관리
                </Link>
              )}
              {isAdmin && p.status !== "closed" && (
                <Link href={`/projects/${p.id}/edit`} className="btn pj-hero-manage">
                  수정
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* (나) 대표 칸 아래쪽에 걸친 흰 카드: 보상·모집 마감·작업 기간·지원자 */}
      <div className="wrap pj-statswrap">
        <dl className="pj-stats">
          <div>
            <dt>보상</dt>
            <dd>{rewardLabel(p)}</dd>
            <span>{p.negotiable ? "지원 때 조율해요" : "만 원 단위"}</span>
          </div>
          <div>
            <dt>모집 마감</dt>
            <dd>{deadlineBig}</dd>
            <span>{deadlineSub}</span>
          </div>
          <div>
            <dt>작업 기간</dt>
            <dd>{period.big}</dd>
            <span>{period.sub}</span>
          </div>
          <div>
            <dt>지원자</dt>
            <dd>{p.status === "soon" ? "모집 전" : `${p.applicants}명`}</dd>
            <span>선정 {p.selected}명</span>
          </div>
        </dl>
      </div>

      {/* (다) 하는 일 */}
      <section className="pj-sec">
        <div className="wrap">
          <div className="pj-intro pj-intro-one">
            <p className="pj-eyebrow">하는 일</p>
            <h2 className="pj-h2">{p.summary}</h2>
            {p.description && <p className="pj-body pj-pre">{p.description}</p>}
          </div>
        </div>
      </section>

      {/* (마) 연결 작품: 제목만(소개·로그라인 칸이 DB에 없다) */}
      {p.work.title && (
        <section className="pj-sec pj-sec-tight">
          <div className="wrap">
            <div className="pj-intro pj-intro-one">
              <p className="pj-eyebrow">연결 작품</p>
              <h2 className="pj-h2">「{p.work.title}」</h2>
            </div>
          </div>
        </section>
      )}

      {/* (바) 자주 띠: 마감 안내와 흰 「지원하기」 */}
      <section className="wrap pj-ctawrap">
        <div className="pj-cta">
          <div>
            <b>{myStatus ? "지원서를 보냈어요" : p.status === "closed" ? "이 프로젝트는 모집이 끝났어요" : "이 프로젝트에 지원하시겠어요?"}</b>
            <span>{ctaNote}</span>
          </div>
          <ApplyButton className="pj-cta-btn" p={p} myStatus={myStatus} />
        </div>
      </section>

      {/* (사) 추천 프로젝트 카드 3장 */}
      {related.length > 0 && (
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
                  <ProjectCard p={r} today={today} bookmarked={marked.has(r.id)} loggedIn={loggedIn} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
