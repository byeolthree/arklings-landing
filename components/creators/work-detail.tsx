import Link from "next/link";
import { CopyLinkButton } from "@/components/portfolio/copy-link-button";
import { formatKstDate } from "@/lib/time";
import type { Role } from "@/lib/collab";
import { RoleTags } from "./role-tags";
import "./creators.css";

export type WorkDetailData = {
  title: string;
  authorName: string; // 닉네임
  publishedAt: string; // 처음 공개한 시각(ISO)
  roles: Role[];
  genres: string[];
  logline: string;
};

// 작품 상세 창: 마이페이지 「포트폴리오 등록」의 펼친 작품 카드와 같은 모양이고 편집용 버튼(↑↓·지우기·손잡이·토글·저장·취소·+ 추가)만 없다. 사이트 기획안 요소는 두지 않는다(로그라인이 다섯 칸을 한 문장으로 엮은 것이므로, 별뜨리님 2026-11-04).
// 프로필 화면 위에서 열린다(D28). 요소 순서는 등록한 사람이 정한 순서이고 접힌 곳 없이 모두 펼쳐 보인다.
// 샘플 미리보기에서는 글·이미지·영상·문서 요소를 자리 표시로 둔다.
export function WorkDetail({ work, closeHref, applyHref }: { work: WorkDetailData; closeHref: string; applyHref: string }) {
  return (
    <div className="cr cr-win-back">
      <div className="cr-win" role="dialog" aria-modal="true" aria-labelledby="cr-win-h">
        <Link href={closeHref} className="btn btn-ghost cr-win-close">
          닫기
        </Link>

        <header>
          <h1 id="cr-win-h" className="cr-win-title">
            {work.title}
          </h1>
          <p className="cr-win-by">
            {work.authorName} · <time dateTime={work.publishedAt}>{formatKstDate(work.publishedAt)}</time>
          </p>
          <RoleTags roles={work.roles} />
          {work.genres.length > 0 && (
            <ul className="cr-genres cr-win-genres" aria-label="장르">
              {work.genres.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          )}
        </header>

        <div className="cr-w-box">
          <h2 className="cr-label">로그라인</h2>
          <p>{work.logline}</p>
        </div>

        <div className="cr-w-el">
          <p className="cr-w-text">〈글〉</p>
        </div>
        <div className="cr-w-media">〈이미지〉</div>
        <div className="cr-w-media">〈영상〉</div>
        <div className="cr-w-media doc">〈문서〉</div>

        <div className="cr-actions">
          <Link href={applyHref} className="btn btn-primary">
            이 작품에 협업 신청 <span className="arrow">→</span>
          </Link>
          <CopyLinkButton />
          <p className="cr-note">신청은 {work.authorName}님께 전달돼요. 로그인하지 않아도 보낼 수 있어요.</p>
        </div>
      </div>
    </div>
  );
}
