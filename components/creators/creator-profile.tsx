import Link from "next/link";
import { BlurImage } from "./blur-image";
import { HeroVideo } from "./hero-video";
import { RoleTags } from "./role-tags";
import { WORK_KINDS, type CreatorProfileData, type WorkCard } from "./types";
import { WorkBands } from "./work-bands";
import "./creators.css";

const iconProps = { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": true } as const;
// 채널 이름에 맞는 로고(인스타그램·유튜브). 그 밖의 채널은 글자만 둔다.
function ChannelLogo({ label }: { label: string }) {
  if (/인스타|instagram/i.test(label))
    return (
      // 인스타그램 브랜드 색(노랑→주황→분홍→보라→파랑 그라데이션). 유튜브 로고처럼 브랜드 색을 그대로 쓴다.
      <svg {...iconProps} fill="none" stroke="url(#cr-ig-grad)" strokeWidth="1.8" strokeLinecap="round">
        <defs>
          <linearGradient id="cr-ig-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#feda75" />
            <stop offset="0.3" stopColor="#fa7e1e" />
            <stop offset="0.55" stopColor="#d62976" />
            <stop offset="0.8" stopColor="#962fbf" />
            <stop offset="1" stopColor="#4f5bd5" />
          </linearGradient>
        </defs>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.8" fill="#d62976" stroke="none" />
      </svg>
    );
  if (/유튜브|youtube/i.test(label))
    return (
      <svg {...iconProps}>
        <rect x="2" y="5" width="20" height="14" rx="4.5" fill="#e53935" />
        <path d="M10 9.2v5.6l5-2.8-5-2.8Z" fill="#fff" />
      </svg>
    );
  return null;
}

// 크리에이터 프로필 화면. 마이페이지 「크리에이터 등록」에 적은 것(닉네임·역할·소개 글·채널 링크·협업 신청 받는 중)이
// 그 칸 순서대로 보이고, 아래 포트폴리오는 「포트폴리오 등록」의 작품 카드와 같은 카드다. 데이터를 받기만 하고 읽지 않는다.
export function CreatorProfile({
  creator,
  works,
  backHref,
  workHref,
  applyHref,
  showApply = true,
  privateNote = false,
  owner,
}: {
  creator: CreatorProfileData;
  works: WorkCard[];
  backHref: string;
  workHref: (id: string) => string;
  applyHref?: string; // 안 주면 협업 신청 버튼을 숨긴다
  showApply?: boolean;
  owner?: { editHref: string; registerHref: string }; // 주인이 자기 프로필을 볼 때만 준다: 「프로필 편집」·「포트폴리오 등록」 버튼과 작품의 공개 스위치·순서 손잡이가 붙는다
  privateNote?: boolean; // 비공개 프로필을 본인이 미리 볼 때 「비공개 상태입니다」 표시(D13) // 비공개 프로필을 본인이 미리 볼 때는 협업 신청 버튼을 숨긴다(D14)
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
            {privateNote && <span className="cr-open">비공개 상태입니다</span>}
            <RoleTags roles={creator.roles} lead />
            <h1 id="cr-hero-name" className="cr-hero-name">
              {creator.name}
            </h1>
            {creator.openToCollab && <span className="cr-open">협업 신청 받는 중</span>}
          </div>
        </div>
      </section>

      <section className="cr-list cr-prof cr-prof-top">
        <div className="wrap">
          <header className="cr-prof-head">
            <div className="cr-prof-text">
              {creator.bio && <p className="cr-prof-bio">{creator.bio}</p>}
              {creator.channels && creator.channels.length > 0 && (
                <ul className="cr-chan" aria-label="채널 링크">
                  {creator.channels.map((c) => (
                    <li key={c.label + c.url}>
                      <a href={c.url} target="_blank" rel="noopener noreferrer">
                        <ChannelLogo label={c.label} />
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
            {owner && (
              <div className="cr-owner-btns">
                <Link href={owner.editHref} className="btn btn-ghost">
                  프로필 편집
                </Link>
                <Link href={owner.registerHref} className="btn btn-jaju-line">
                  포트폴리오 등록
                </Link>
              </div>
            )}
          </header>

          <div className="cr-sec-head">
            <h2 className="cr-sec-title">포트폴리오</h2>
            {works.length > 0 && (
              <span className="cr-count">
                작품 {works.length}건{owner && " · 스위치로 공개를 켜고 끄고, ⠿ 손잡이를 끌어 순서를 바꿉니다"}
              </span>
            )}
          </div>

        </div>
      </section>

      {works.length === 0 ? (
        <section className="cr-list cr-band-empty">
          <div className="wrap">
            <div className="panel cr-state">
              <h2>아직 올린 작품이 없어요</h2>
              <p>공개한 작품이 생기면 여기에 보여요.</p>
            </div>
          </div>
        </section>
      ) : (
        <WorkBands key={works.map((w) => `${w.id}${w.isPublic === false ? "0" : "1"}`).join()} works={works} hrefs={works.map((w) => workHref(w.id))} owner={Boolean(owner)} roles={creator.roles} />
      )}

      {/* 스크롤해도 화면 아래에 붙어 있다가, 맨 끝에서는 제자리에 놓인다(바깥 틀이 키가 커야 붙으므로 맨 아래 직속으로 둔다) */}
      {creator.openToCollab && showApply && applyHref && (
        <div className="cr-apply-stick">
          <Link href={applyHref} className="btn btn-primary">
            이 크리에이터에게 협업 신청 <span className="arrow">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
