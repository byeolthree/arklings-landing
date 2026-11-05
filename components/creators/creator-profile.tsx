import Link from "next/link";
import { RoleTags } from "./role-tags";
import { WORK_KINDS, type CreatorProfileData, type WorkCard } from "./types";
import { WorkMedia } from "./work-media";
import "./creators.css";

const TONES = ["teal", "dusty", "sage"] as const;
// 프로필 원 색은 공개 주소 글자로 정해 같은 사람은 늘 같은 색이다.
function toneOf(handle: string): (typeof TONES)[number] {
  let n = 0;
  for (const ch of handle) n = (n * 31 + ch.charCodeAt(0)) % 1000003;
  return TONES[n % TONES.length];
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
      <section className="cr-list cr-prof">
        <div className="wrap">
          <Link href={backHref} className="cr-back">
            ← 크리에이터
          </Link>

          <header className="cr-prof-head">
            <span className={`cr-av cr-av-lg ${toneOf(creator.handle)}`} aria-hidden="true">
              {creator.name.slice(0, 1)}
            </span>
            <div className="cr-prof-text">
              <h1 className="cr-prof-name">{creator.name}</h1>
              <RoleTags roles={creator.roles} />
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
              {creator.openToCollab && <span className="cr-open">협업 신청 받는 중</span>}
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
