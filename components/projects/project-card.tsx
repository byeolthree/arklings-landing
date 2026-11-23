import Link from "next/link";
import { RoleTags } from "@/components/creators/role-tags";
import { dday, daysUntil, monthDay, rewardText } from "./filter";
import { SOURCE_LABEL, STATUS_LABEL, type Project } from "./types";

// 모집 상태 배지: 모집 중=자주 채움·흰 글자, 모집 예정=자주 외곽선, 모집 마감=테두리색 바탕(시안)
export function StatusBadge({ status }: { status: Project["status"] }) {
  return <span className={`pj-badge ${status}`}>{STATUS_LABEL[status]}</span>;
}

// 북마크 버튼. 이번 단계는 모양만이라 눌러도 저장하지 않는다(저장은 다음 단계).
export function BookmarkButton({ onDark = false }: { onDark?: boolean }) {
  return (
    <button type="button" className={`pj-bm${onDark ? " on-dark" : ""}`} aria-label="북마크" aria-pressed="false">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4h10v16l-5-3.6L7 20V4Z" />
      </svg>
    </button>
  );
}

// 카드 아래줄의 마감·모집 시작 글자
export function dateLine(p: Project, today: string): string {
  if (p.status === "open") {
    const n = daysUntil(p.deadline, today);
    return `${monthDay(p.deadline)} 마감 · ${dday(n)}`;
  }
  if (p.status === "soon") return `${monthDay(p.opensAt)} 모집 시작`;
  return "모집 마감";
}

export function ProjectCard({ p, today }: { p: Project; today: string }) {
  return (
    <article className="panel pj-card">
      <div className="pj-card-top">
        <StatusBadge status={p.status} />
        <span className="pj-source">{SOURCE_LABEL[p.source]}</span>
        <div className="pj-card-bm">
          <BookmarkButton />
        </div>
      </div>
      <Link href={`/projects/${p.id}`} className="pj-card-link">
        <h2 className="pj-card-title">{p.title}</h2>
        <p className="pj-card-sum">{p.summary}</p>
      </Link>
      <div className="pj-card-tags">
        <RoleTags roles={p.roles} lead />
        {p.genres.length > 0 && (
          <ul className="cr-genres" aria-label="장르">
            {p.genres.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="pj-card-foot">
        <b className="pj-reward">{rewardText(p)}</b>
        <span className="pj-date">{dateLine(p, today)}</span>
        <span className="pj-apps">{p.status === "soon" ? "모집 전" : `지원 ${p.applicants}명`}</span>
      </div>
    </article>
  );
}
