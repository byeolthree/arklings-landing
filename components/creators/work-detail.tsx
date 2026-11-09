import Link from "next/link";
import { CopyLinkButton } from "@/components/portfolio/copy-link-button";
import { formatKstDate } from "@/lib/time";
import type { Role } from "@/lib/collab";
import type { WorkBlock } from "@/lib/creators";
import { orderItems } from "@/lib/creator-cards";
import { LOGLINE_TOKEN } from "@/lib/creator-rules";
import { RoleTags } from "./role-tags";
import "./creators.css";

export type WorkDetailData = {
  title: string;
  authorName: string; // 닉네임
  publishedAt: string; // 처음 공개한 시각(ISO)
  roles: Role[];
  genres: string[];
  logline: string;
  blocks?: WorkBlock[]; // 실제 요소(만든 사람이 정한 순서). 안 주면 샘플 자리 표시
  loglinePosition?: number; // 로그라인 앞에 있는 요소의 개수(0이면 맨 위, D35-2). 안 주면 맨 위
};

// 작품 상세 창: 마이페이지 「포트폴리오 등록」의 펼친 작품 카드와 같은 모양이고 편집용 버튼(↑↓·지우기·손잡이·토글·저장·취소·+ 추가)만 없다. 사이트 기획안 요소는 두지 않는다(로그라인이 다섯 칸을 한 문장으로 엮은 것이므로, 별뜨리님 승인 2026-11-04).
// 프로필 화면 위에서 열린다(D28). 요소 순서는 등록한 사람이 정한 순서이고 접힌 곳 없이 모두 펼쳐 보인다.
// 샘플 미리보기에서는 글·이미지·영상·문서 요소를 자리 표시로 둔다.
export function WorkDetail({ work, closeHref, applyHref }: { work: WorkDetailData; closeHref: string; applyHref?: string }) {
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

        {work.blocks ? (
          orderItems(work.blocks, work.loglinePosition ?? 0).map((b) =>
            b === LOGLINE_TOKEN ? (
              <div key="logline" className="cr-w-box">
                <h2 className="cr-label">로그라인</h2>
                <p>{work.logline}</p>
              </div>
            ) : b.kind === "text" ? (
              <div key={b.id} className="cr-w-el">
                <p className="cr-w-text" style={{ whiteSpace: "pre-wrap" }}>{b.body}</p>
              </div>
            ) : b.kind === "image" ? (
              b.src ? (
                // 비공개 보관함의 짧은 임시 주소라 next/image 최적화를 거치지 않는다.
                // eslint-disable-next-line @next/next/no-img-element
                <img key={b.id} src={b.src} alt={b.fileName ?? "이미지"} className="cr-w-media" style={{ width: "100%", height: "auto", aspectRatio: "auto", objectFit: "contain" }} />
              ) : (
                <div key={b.id} className="cr-w-media">이미지를 불러오지 못했어요</div>
              )
            ) : b.kind === "video" ? (
              b.youtubeId ? (
                <div key={b.id} className="cr-w-media" style={{ overflow: "hidden" }}>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${b.youtubeId}`}
                    title="영상"
                    loading="lazy"
                    allow="encrypted-media; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    style={{ width: "100%", height: "100%", border: 0 }}
                  />
                </div>
              ) : b.src ? (
                <div key={b.id} className="cr-w-media" style={{ overflow: "hidden", background: "#000" }}>
                  <video src={b.src} controls playsInline preload="metadata" style={{ width: "100%", height: "100%" }} />
                </div>
              ) : (
                <div key={b.id} className="cr-w-media">영상을 불러오지 못했어요</div>
              )
            ) : b.src ? (
              <div key={b.id} className="cr-w-el">
                <a href={b.src} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                  {b.fileName ?? "문서(PDF)"} 열기 ↗
                </a>
              </div>
            ) : (
              <div key={b.id} className="cr-w-media doc">문서를 불러오지 못했어요</div>
            ),
          )
        ) : (
          <>
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
          </>
        )}

        <div className="cr-actions">
          {applyHref && (
            <Link href={applyHref} className="btn btn-primary">
              이 작품에 협업 신청 <span className="arrow">→</span>
            </Link>
          )}
          <CopyLinkButton />
          {applyHref && <p className="cr-note">신청은 {work.authorName}님께 전달돼요. 로그인하지 않아도 보낼 수 있어요.</p>}
        </div>
      </div>
    </div>
  );
}
