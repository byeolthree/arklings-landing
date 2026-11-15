import Link from "next/link";
import type { ReactNode } from "react";
import { BlurVideo } from "./blur-video";
import { RoleTags } from "./role-tags";
import type { CreatorCard } from "./types";

// 탐색 카드 한 장(2026-11-13 시안 card11). 탐색 화면과 등록 화면의 미리보기가 이 하나를 같이 쓴다(2026-11-14).
// 프로필 동그라미 없음, 협업 신청은 오른쪽 위 아이콘 버튼, 역할 태그는 외곽선(맨 앞이 대표).
// 대표 콘텐츠 칸은 카드 좌우 끝까지, 역할 태그는 그 밑. 이미지·영상 파일이 없으면 로그라인 칸. 이미지·영상이면 칸 왼쪽 아래에 「제목 · 종류」(반투명 어두운 바탕),
// 로그라인·문서면 칸 맨 위에 「제목 · 종류」(테두리색 바탕)와 그 글. 장르는 #글자.
// profileHref가 없으면(미리보기) 링크 없이 같은 모양으로만 그린다.
export function ExploreCard({ c, profileHref, applyHref }: { c: CreatorCard; profileHref?: string; applyHref?: string }) {
  const kindLabel = c.main === "media" && c.hero ? c.mainSub : (c.docLabel ?? "로그라인");
  return (
    <div className="panel cr-card cr-card-v2">
      <div className="cr-v2-top">
        <Go href={profileHref} className={`cr-v2-who${profileHref ? " cr-stretch" : ""}`}>
          <span className="cr-name">{c.name}</span>
          {c.bio && <span className="cr-bio">{c.bio}</span>}
        </Go>
        {c.openToCollab &&
          (applyHref ? (
            <Link href={applyHref} className="cr-ask" aria-label={`${c.name}님에게 협업 신청`} title="협업 신청">
              <SendIcon />
            </Link>
          ) : (
            !profileHref && (
              <span className="cr-ask" aria-hidden="true">
                <SendIcon />
              </span>
            )
          ))}
      </div>
      <Go href={profileHref} className="cr-card-main">
        <div className={`cr-v2-main ${c.main === "media" && c.hero ? "media" : "logline"}`}>
          {c.main === "media" && c.hero ? (
            c.hero === "video" && c.heroSrc ? (
              <BlurVideo src={c.heroSrc} className="cr-main-media has-src" label="대표 영상" />
            ) : c.hero === "image" && c.heroSrc ? (
              // 대표 이미지: 꽉 채우기(cover) / 비율 유지하기(contain)
              <div className={`cr-main-media has-src cr-v2-img ${c.mainFit === "cover" ? "fit-cover" : "fit-contain"}`} role="img" aria-label="대표 이미지">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.heroSrc} alt="" loading="lazy" />
              </div>
            ) : (
              <div className="cr-main-media" role="img" aria-label={c.hero === "video" ? "대표 영상" : "대표 이미지"}>
                {c.hero === "video" ? "▶ 〈대표 영상〉" : "〈대표 이미지〉"}
              </div>
            )
          ) : (
            <div className="cr-box">
              <p className="cr-v2-cap plain">
                <span className="cr-v2-cap-t">{c.latest.title}</span>
                <span className="cr-v2-cap-dot" aria-hidden="true">·</span>
                <span className="cr-v2-cap-k">{kindLabel}</span>
              </p>
              <p className="cr-box-logline">{c.docLabel ? c.docText : c.latest.logline}</p>
            </div>
          )}
          {c.main === "media" && c.hero && (c.latest.title || kindLabel) && (
            <p className="cr-v2-cap">
              {c.latest.title && <span className="cr-v2-cap-t">{c.latest.title}</span>}
              {c.latest.title && kindLabel && <span className="cr-v2-cap-dot" aria-hidden="true">·</span>}
              {kindLabel && <span className="cr-v2-cap-k">{kindLabel}</span>}
            </p>
          )}
        </div>
        {/* 역할 태그는 대표 콘텐츠 밑(2026-11-14 아키텍터 지시) */}
        <RoleTags roles={c.roles} lead />
        {c.latest.genres && c.latest.genres.length > 0 && (
          <ul className="cr-genres cr-genres-hash" aria-label="장르">
            {c.latest.genres.map((g) => (
              <li key={g}>#{g}</li>
            ))}
          </ul>
        )}
      </Go>
    </div>
  );
}

// 링크 주소가 있으면 링크, 없으면(미리보기) 같은 모양의 칸
function Go({ href, className, children }: { href?: string; className: string; children: ReactNode }) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

// 협업 신청 아이콘(종이비행기)
function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}
