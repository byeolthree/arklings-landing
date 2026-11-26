import Link from "next/link";
import { RoleTags } from "@/components/creators/role-tags";
import { BookmarkButton } from "./bookmark-button";
import { dday, daysUntil, monthDay } from "./filter";
import { rewardLabel } from "@/lib/projects";
import { SOURCE_LABEL, STATUS_LABEL, type Project } from "./types";

// 모집 상태 배지: 모집 중=자주 채움·흰 글자, 모집 예정=자주 외곽선, 모집 마감=테두리색 바탕(시안)
export function StatusBadge({ status }: { status: Project["status"] }) {
  return <span className={`pj-badge ${status}`}>{STATUS_LABEL[status]}</span>;
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

// bookmarked: 내 북마크인지, loggedIn: 로그인했는지(안 했으면 북마크를 누를 때 로그인 화면으로 보낸다)
export function ProjectCard({ p, today, bookmarked = false, loggedIn = false }: { p: Project; today: string; bookmarked?: boolean; loggedIn?: boolean }) {
  return (
    <article className="panel pj-card">
      <div className="pj-card-top">
        <StatusBadge status={p.status} />
        <span className="pj-source">{SOURCE_LABEL[p.source]}</span>
        <div className="pj-card-bm">
          <BookmarkButton projectId={p.id} title={p.title} initial={bookmarked} loggedIn={loggedIn} />
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
        <b className="pj-reward">{rewardLabel(p)}</b>
        <span className="pj-date">{dateLine(p, today)}</span>
        <span className="pj-apps">{p.status === "soon" ? "모집 전" : `지원 ${p.applicants}명`}</span>
      </div>
    </article>
  );
}
