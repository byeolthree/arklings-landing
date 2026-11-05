import Link from "next/link";
import { BlurImage } from "./blur-image";
import { HeroVideo } from "./hero-video";
import { RoleTags } from "./role-tags";
import { WORK_KINDS, type CreatorProfileData, type WorkCard } from "./types";
import { WorkMedia } from "./work-media";
import "./creators.css";

// 크리에이터 프로필 화면. 마이페이지 「크리에이터 등록」에 적은 것(닉네임·역할·소개 글·채널 링크·협업 신청 받는 중)이
// 그 칸 순서대로 보이고, 아래 포트폴리오는 「포트폴리오 등록」의 작품 카드와 같은 카드다. 데이터를 받기만 하고 읽지 않는다.
export function CreatorProfile({
  creator,
  works,
  backHref,
  workHref,
  applyHref,
  showApply = true,
}: {
  creator: CreatorProfileData;
  works: WorkCard[];
  backHref: string;
  workHref: (id: string) => string;
  applyHref: string;
  showApply?: boolean; // 비공개 프로필을 본인이 미리 볼 때는 협업 신청 버튼을 숨긴다(D14)
}) {
  // 종류별 작품 수(작품이 있는 종류만, 정해진 종류 순서대로)
  const kinds = WORK_KINDS.map((k) => [k, works.filter((w) => w.kind === k).length] as const).filter(([, n]) => n > 0);
  return (
    <div className="cr">
      {/* 맨 위: 크리에이터를 대표하는 이미지나 영상 위에 닉네임이 아주 크게 올라간다. 대표를 안 올렸으면 닉네임만 크게 */}
      <section className={`cr-hero${creator.hero ? "" : " none"}`} aria-labelledby="cr-hero-name">
        {creator.hero && (
          creator.hero === "video" && creator.heroSrc ? (
            <HeroVideo src={creator.heroSrc} />
          ) : creator.hero === "image" && creator.heroSrc ? (
            <BlurImage src={creator.heroSrc} className="cr-hero-media has-src" label="대표 이미지" />
          ) : (
            <div className="cr-hero-media" role="img" aria-label={creator.hero === "video" ? "대표 영상" : "대표 이미지"}>
              {creator.hero === "video" ? "▶ 〈대표 영상〉" : "〈대표 이미지〉"}
            </div>
          )
        )}
        <div className="wrap cr-hero-over">
          <Link href={backHref} className="cr-back">
            ← 크리에이터
          </Link>
          <div className="cr-hero-body">
            <RoleTags roles={creator.roles} />
            <h1 id="cr-hero-name" className="cr-hero-name">
              {creator.name}
            </h1>
            {creator.openToCollab && <span className="cr-open">협업 신청 받는 중</span>}
          </div>
        </div>
      </section>

      <section className="cr-list cr-prof">
        <div className="wrap">
          <header className="cr-prof-head">
            <div className="cr-prof-text">
              {creator.bio && <p className="cr-prof-bio">{creator.bio}</p>}
              {creator.channels && creator.channels.length > 0 && (
                <ul className="cr-chan" aria-label="채널 링크">
                  {creator.channels.map((c) => (
                    <li key={c.label + c.url}>
                      <a href={c.url} target="_blank" rel="noopener noreferrer">
                        {c.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {kinds.length > 0 && (
                <ul className="cr-kinds" aria-label="종류별 작품 수">
                  {kinds.map(([k, n]) => (
                    <li key={k}>
                      {k} <b>{n}</b>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </header>

          <div className="cr-sec-head">
            <h2 className="cr-sec-title">포트폴리오</h2>
            {works.length > 0 && <span className="cr-count">작품 {works.length}건</span>}
          </div>

          {works.length === 0 ? (
            <div className="panel cr-state">
              <h2>아직 올린 작품이 없어요</h2>
              <p>공개한 작품이 생기면 여기에 보여요.</p>
            </div>
          ) : (
            <ul className="cr-grid">
              {works.map((w) => (
                <li key={w.id}>
                  <article className="panel cr-work">
                    <h3 className="cr-work-title">
                      <Link href={workHref(w.id)}>{w.title}</Link>
                    </h3>
                    <div className="cr-box cr-work-log">
                      <span className="cr-label">로그라인</span>
                      <p className="cr-box-logline">{w.logline}</p>
                    </div>
                    <p className="cr-work-kind">
                      <span className="cr-kind">{w.kind}</span>
                    </p>
                    <WorkMedia href={workHref(w.id)} slides={["〈대표 이미지〉", "〈영상〉"]} />
                    <RoleTags roles={w.roles} />
                    {w.genres.length > 0 && (
                      <ul className="cr-genres" aria-label="장르">
                        {w.genres.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ul>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          )}

          {/* 스크롤해도 화면 아래에 붙어 있다가, 맨 끝에서는 제자리에 놓인다 */}
          {creator.openToCollab && showApply && (
            <div className="cr-apply-stick">
              <Link href={applyHref} className="btn btn-primary">
                이 크리에이터에게 협업 신청 <span className="arrow">→</span>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
