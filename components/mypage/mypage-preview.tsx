"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SAMPLE_CREATORS } from "@/components/creators/sample-data";
import { PublishProfile, type HandleCheck, type SaveResult } from "@/components/planner/publish-profile";
import { ROLES } from "@/lib/collab";
import { GENRES } from "@/components/creators/genres";
import { WorkEditor } from "@/components/mypage/work-editor";
import type { ProfileValues } from "@/lib/creator-rules";

export type ProfileState = "none" | "public" | "private";

// 로그인 결과 안내: 지금 마이페이지(app/mypage/page.tsx)가 쓰는 문구 그대로.
const MESSAGES: Record<string, { text: string; ok?: boolean }> = {
  linked: { text: "로그인 방법을 추가했어요.", ok: true },
  unlinked: { text: "로그인 방법을 해제했어요.", ok: true },
  link_failed: { text: "로그인 방법을 바꾸지 못했어요. 잠시 뒤에 다시 시도해 주세요." },
  unlink_last: { text: "로그인 방법이 하나뿐이라 해제할 수 없어요. 다른 방법을 먼저 추가해 주세요." },
};

const BASE_SECTIONS = [
  { id: "mp-basic", label: "기본 정보" },
  { id: "mp-creator", label: "크리에이터" },
  { id: "mp-portfolio", label: "포트폴리오" },
] as const;
const COLLAB_SECTION = { id: "mp-collab", label: "협업 신청" } as const;
type SectionId = (typeof BASE_SECTIONS)[number]["id"] | typeof COLLAB_SECTION.id;

const SAMPLE_PROFILE: Partial<ProfileValues> = {
  handle: "my-name",
  roles: ["script", "video"],
  about: "",
  channels: [],
  openToCollab: true,
};

// 샘플: 크리에이터를 대표하는 이미지나 영상 한 가지를 고른다(프로필 맨 위와 목록 카드에 걸린다). 파일은 어디에도 올라가지 않는다.
// 받는 파일(별뜨리님 지시 2026-11-05, 이미지는 D17·D19): 이미지 JPG·PNG·WEBP 5MB 이하, 영상 MP4 10MB 이하.
const HERO_RULE = {
  image: { types: ["image/jpeg", "image/png", "image/webp"], max: 5 * 1024 * 1024, accept: "image/jpeg,image/png,image/webp", hint: "JPG, PNG, WEBP · 5MB 이하" },
  video: { types: ["video/mp4"], max: 10 * 1024 * 1024, accept: "video/mp4", hint: "MP4(H.264) · 10MB 이하 · 가로 1280×720(16:9) · 15~30초 · 소리는 AAC" },
} as const;

const VIDEO_PROMPT = `첨부한 영상을 웹사이트 프로필 맨 위에 거는 「대표 영상」으로 변환해 줘.

[출력 형식]
- 파일 형식: MP4 (컨테이너 MP4, 영상 H.264, 소리 AAC)
- 화면 비율: 16:9 가로. 검은 띠(레터박스)를 새로 넣지 말고 원본 비율을 그대로 유지
- 해상도: 가로 1280 × 세로 720 (1080p 이상으로 만들지 말 것)
- 초당 장면 수: 30 (원본이 더 높아도 30으로)
- 길이: 15~30초. 길면 가장 인상적인 구간 하나만 자르고, 페이드 인/아웃은 넣지 않음(반복 재생됨)
- 영상 비트레이트: 약 1.5 Mbps (최대 2.5 Mbps)
- 소리: AAC 스테레오 96 kbps. 소리 없는 구간이 있어도 소리 트랙은 남길 것
- 파일 용량: 6MB 이하 (절대 10MB를 넘지 말 것)
- 인터넷에서 바로 재생되게 「faststart」(moov atom을 앞쪽으로) 옵션을 켤 것
- 자막, 로고, 워터마크, 글자를 영상에 새로 입히지 말 것

[확인 후 알려 줄 것]
- 최종 해상도, 길이, 용량(MB), 영상·소리 비트레이트, 초당 장면 수
- 원본에서 자른 구간(시작~끝 시간)`;

function HeroField() {
  const [kind, setKind] = useState<"image" | "video">("image");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState("");
  const rule = HERO_RULE[kind];
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(VIDEO_PROMPT);
      setCopied("복사했어요. 영상 변환 도구에 붙여 넣으세요.");
    } catch {
      setCopied("복사하지 못했어요.");
    }
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return setMsg("");
    if (!(rule.types as readonly string[]).includes(f.type)) {
      e.target.value = "";
      return setMsg(kind === "image" ? "JPG, PNG, WEBP 파일만 올릴 수 있어요." : "MP4 파일만 올릴 수 있어요.");
    }
    if (f.size > rule.max) {
      e.target.value = "";
      return setMsg(`선택한 파일이 ${(f.size / 1024 / 1024).toFixed(1)}MB예요. ${rule.max / 1024 / 1024}MB 이하만 올릴 수 있어요.`);
    }
    setMsg("");
  }
  return (
    <div className="pp-field">
      <span className="pp-label" id="pp-hero-label">
        대표 이미지·영상 <span className="pp-hint-inline">(선택)</span>
      </span>
      <div className="pp-roles" role="group" aria-labelledby="pp-hero-label">
        <button type="button" className="opt" aria-pressed={kind === "image"} onClick={() => { setKind("image"); setMsg(""); setCopied(""); }}>
          이미지
        </button>
        <button type="button" className="opt" aria-pressed={kind === "video"} onClick={() => { setKind("video"); setMsg(""); setCopied(""); }}>
          영상
        </button>
        {kind === "video" && (
          <>
            <button type="button" className="btn btn-ghost" onClick={copyPrompt}>
              영상 변환 프롬프트 복사
            </button>
            <span role="status" aria-live="polite" className="len" style={{ alignSelf: "center" }}>
              {copied}
            </span>
          </>
        )}
      </div>
      <input key={kind} type="file" accept={rule.accept} onChange={onFile} aria-label={kind === "image" ? "대표 이미지 파일" : "대표 영상 파일"} aria-describedby="pp-hero-hint" />
      <p id="pp-hero-hint" className="len">{rule.hint}</p>
      {msg && (
        <p className="pp-err" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}

function Section({
  id,
  tone,
  title,
  extra,
  open,
  onToggle,
  noToggle,
  children,
}: {
  id: string;
  tone: "s1" | "s2" | "s3" | "s4";
  title: string;
  extra?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  noToggle?: boolean; // 접기 버튼이 없는 구역(포트폴리오 등록: 맨 윗줄이 접힌 등록 화면)
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`mp-sec ${tone}`} aria-labelledby={`${id}-h`}>
      <div className="wrap">
        <div className="mp-sh">
          <h2 id={`${id}-h`}>{title}</h2>
          {extra && <div className="mp-extra">{extra}</div>}
          {!noToggle && (
            <button type="button" className="btn btn-ghost mp-toggle" aria-expanded={open} aria-controls={`${id}-body`} onClick={onToggle}>
              {open ? "접기" : "펼치기"}
              <span className="mp-chev" aria-hidden="true" />
            </button>
          )}
        </div>
        <div id={`${id}-body`} className="mp-card" hidden={!open}>
          {children}
        </div>
      </div>
    </section>
  );
}

// 샘플 미리보기용: 실제 저장·로그인·DB와 연결되지 않는다. 디자인이 끝나면 지운다.
// basic·plans·collab을 넘기면 실제 로그인 화면(/mypage)이 되고, 넘기지 않으면 샘플 값으로 그린다.
export function MypagePreview({
  profile,
  msg,
  pending,
  basic,
  plans,
  collab,
  hideSamples = false,
  creator,
  portfolio,
}: {
  profile: ProfileState;
  msg?: string;
  pending: boolean;
  basic?: React.ReactNode;
  plans?: React.ReactNode;
  collab?: { newCount: number | null; content?: React.ReactNode };
  // true이면 아직 저장 기능이 없는 샘플 구역(크리에이터 등록, 포트폴리오 작품)을 숨기고 진짜 「내 기획안」 목록만 보여 준다(실제 사이트용).
  hideSamples?: boolean;
  // 실제 「크리에이터 등록」·「포트폴리오 등록」 구역(저장되는 진짜 화면). 주면 샘플 대신 이것을 그린다.
  creator?: React.ReactNode;
  portfolio?: React.ReactNode;
}) {
  const showCreator = !hideSamples || creator !== undefined;
  const baseSections: readonly { id: SectionId; label: string }[] = !showCreator ? [{ id: "mp-basic", label: "기본 정보" }, { id: "mp-portfolio", label: "내 기획안" }] : BASE_SECTIONS;
  const SECTIONS: readonly { id: SectionId; label: string }[] = collab ? [...baseSections, COLLAB_SECTION] : baseSections;
  const [open, setOpen] = useState<Record<SectionId, boolean>>({ "mp-basic": true, "mp-creator": true, "mp-portfolio": true, "mp-collab": true });
  const [active, setActive] = useState<string>("mp-basic");
  const [saved, setSaved] = useState(false);
  const [showPending, setShowPending] = useState(pending);
  const [openWork, setOpenWork] = useState<[boolean, boolean]>([true, true]);
  const setWork = (i: 0 | 1, v: boolean) => setOpenWork((cur) => (i === 0 ? [v, cur[1]] : [cur[0], v]));
  const banner = msg ? MESSAGES[msg] : undefined;
  const exists = profile !== "none";
  const isPublic = profile === "public";
  // 기획안 화면 샘플: 프로필이 없으면 프로필 칸, 비공개 프로필이 있으면 「프로필도 공개할까요?」, 공개 프로필이면 기획안 화면 그대로
  const PLANNER_HREF = (profile === "none" ? "/dev-preview/profile-form?state=planner" : profile === "private" ? "/dev-preview/profile-form?state=planner-private" : "/planner");

  // 지금 화면에 보이는 구역을 이동 줄에 표시한다.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    // 맨 아래까지 내려가면 마지막 구역(화면이 짧아 맨 위에 닿지 못해도)을 표시한다.
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) setActive(SECTIONS[SECTIONS.length - 1].id);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!collab]);

  const toggle = (id: keyof typeof open) => setOpen((cur) => ({ ...cur, [id]: !cur[id] }));
  const go = (id: keyof typeof open) => {
    setOpen((cur) => ({ ...cur, [id]: true }));
    setActive(id);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  async function checkHandle(handle: string): Promise<HandleCheck> {
    await new Promise((r) => setTimeout(r, 500));
    if (handle === "check-fail") return "error";
    return SAMPLE_CREATORS.some((c) => c.handle === handle) || handle === "taken-name" ? "taken" : "available";
  }
  async function onSubmit(): Promise<SaveResult> {
    await new Promise((r) => setTimeout(r, 700));
    setSaved(true);
    setShowPending(false);
    return { ok: true };
  }

  return (
    <div className="mp">
      <div className="mp-top">
        <div className="wrap">
          <h1 className="mp-title">마이페이지</h1>
          {!basic && <p className="mp-desc">〈설명 문구〉</p>}
        </div>
      </div>

      <nav className="mp-nav" aria-label="구역 이동">
        <div className="wrap">
          <div className="mp-tabs">
            {SECTIONS.map((s) => (
              <button key={s.id} type="button" className="mp-tab" aria-current={active === s.id ? "true" : undefined} onClick={() => go(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="mp-body">
          <Section id="mp-basic" tone="s1" title="기본 정보" open={open["mp-basic"]} onToggle={() => toggle("mp-basic")}>
            {basic ?? (
              <>
            <dl className="mp-rows">
              <div className="mp-row">
                <dt>닉네임</dt>
                <dd>
                  <div className="mp-name">
                    <input className="mp-input" type="text" maxLength={30} defaultValue="" aria-label="닉네임" />
                    <button type="button" className="btn btn-ghost">
                      이름 저장
                    </button>
                  </div>
                  <span className="mp-note">포트폴리오에서 다른 사람에게 보이는 이름이에요. 30자 이내.</span>
                </dd>
              </div>
              <div className="mp-row">
                <dt>로그인 방법</dt>
                <dd>
                  {banner && (
                    <p role={banner.ok ? "status" : "alert"} className={`mp-msg ${banner.ok ? "ok" : "err"}`}>
                      {banner.text}
                    </p>
                  )}
                  구글 · 이메일
                </dd>
              </div>
              <div className="mp-row">
                <dt>방법 추가·해제</dt>
                <dd>
                  <div className="mp-btns">
                    <button type="button" className="btn btn-ghost">
                      카카오 연결하기
                    </button>
                    <button type="button" className="btn btn-ghost">
                      구글 해제
                    </button>
                  </div>
                  <span className="mp-note">로그인 방법은 항상 한 가지 이상 남아 있어야 해요.</span>
                </dd>
              </div>
              <div className="mp-row">
                <dt>내 이메일</dt>
                <dd>
                  <span style={{ wordBreak: "break-all" }}>sample@example.com</span>
                  <span className="mp-note">이 주소는 나에게만 보여요.</span>
                </dd>
              </div>
            </dl>
            <div className="mp-foot">
              <div>
                <button type="button" className="btn btn-ghost">
                  로그아웃
                </button>
              </div>
              <small>
                더 이상 쓰지 않으신다면 <Link href="/mypage/withdraw">회원 탈퇴</Link>를 할 수 있어요.
              </small>
            </div>
              </>
            )}
          </Section>

          {showCreator && (
          <Section
            id="mp-creator"
            tone="s2"
            title="크리에이터 등록"
            extra={
              creator === undefined && exists ? (
                <>
                  <Link className="mp-addr" href={`/dev-preview/creators/${SAMPLE_PROFILE.handle}?mine=${isPublic ? "public" : "private"}`}>
                    /creators/{SAMPLE_PROFILE.handle} ↗
                  </Link>
                  <span className={`mp-state ${isPublic ? "on" : ""}`}>{isPublic ? "공개 중" : "비공개"}</span>
                </>
              ) : undefined
            }
            open={open["mp-creator"]}
            onToggle={() => toggle("mp-creator")}
          >
            {creator !== undefined ? creator : (<>
            {showPending && (
              <div className="mp-pending">
                <span>〈저장 뒤 올라갈 작품: 제목〉</span>
                <button type="button" className="btn btn-ghost" onClick={() => setShowPending(false)}>
                  취소
                </button>
              </div>
            )}
            <div className="pl mp-pl">
              <PublishProfile
                key={profile}
                mode={exists ? "edit" : "create"}
                context="mypage"
                initial={exists ? { ...SAMPLE_PROFILE, isPublic } : undefined}
                onSubmit={onSubmit}
                checkHandle={checkHandle}
                heroField={<HeroField />}
              />
            </div>
            {saved && <p className="mp-sample">저장했어요(샘플).</p>}
            </>)}
          </Section>
          )}

          <Section id="mp-portfolio" tone="s3" title={!showCreator ? "내 기획안" : "포트폴리오 등록"} open={open["mp-portfolio"]} onToggle={() => toggle("mp-portfolio")} noToggle={showCreator && portfolio !== undefined}>
            {showCreator && portfolio === undefined && (
            <div className="mp-top-row">
              <div className="mp-count">
                <span>〈작품 4 / 12〉</span>
                <span>〈파일 12MB / 20MB〉</span>
              </div>
              <button type="button" className="btn btn-primary">
                〈작품 추가〉
              </button>
            </div>
            )}

            {!(showCreator && portfolio !== undefined) && (
            <div className="mp-plans">
              <h3>내 기획안</h3>
              {plans ?? (
              <ul>
                <li>
                  <span>〈기획안 제목〉</span>
                  <span>〈공개 중〉 · <Link href={PLANNER_HREF}>열기</Link></span>
                </li>
                <li>
                  <span>〈기획안 제목〉</span>
                  <span>〈공개하지 않음〉 · <Link href={PLANNER_HREF}>열기</Link></span>
                </li>
                <li className="off">
                  <span>〈기획안 제목〉</span>
                  <span>〈다른 작품에 붙음〉</span>
                </li>
              </ul>
              )}
            </div>
            )}

            {showCreator && portfolio !== undefined && portfolio}
            {showCreator && portfolio === undefined && (
            <div className="mp-works">
              {openWork[0] ? (
                <WorkEditor isPublic={true} roles={["video", "script"]} onFold={() => setWork(0, false)} />
              ) : (
              <div className="mp-work">
                <div className="mp-thumb">대표 이미지</div>
                <div className="mp-work-main">
                  <p className="mp-work-title">〈작품 제목〉</p>
                  <div className="mp-work-meta">
                    <span className="mp-tag">{ROLES.video}</span>
                    <span className="mp-tag">{ROLES.script}</span>
                    <span>〈공개 중〉</span>
                  </div>
                  <div className="mp-genres">
                    <span className="mp-tag genre">{GENRES[0]}</span>
                    <span className="mp-tag genre">{GENRES[2]}</span>
                  </div>
                </div>
                <div className="mp-work-btns">
                  <button type="button" className="btn btn-ghost">
                    포트폴리오에서 내리기
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setWork(0, true)}>
                    펼쳐서 꾸미기 ▾
                  </button>
                </div>
              </div>
              )}
              {openWork[1] ? (
                <WorkEditor isPublic={false} roles={["art_director"]} onFold={() => setWork(1, false)} />
              ) : (
              <div className="mp-work">
                <div className="mp-thumb">대표 이미지</div>
                <div className="mp-work-main">
                  <p className="mp-work-title">〈작품 제목〉</p>
                  <div className="mp-work-meta">
                    <span className="mp-tag">{ROLES.art_director}</span>
                    <span>〈공개하지 않음〉</span>
                  </div>
                  <div className="mp-genres">
                    <span className="mp-tag genre">{GENRES[0]}</span>
                  </div>
                </div>
                <div className="mp-work-btns">
                  <button type="button" className="btn btn-ghost">
                    포트폴리오에 올리기
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setWork(1, true)}>
                    펼쳐서 꾸미기 ▾
                  </button>
                </div>
              </div>
              )}
            </div>
            )}
          </Section>

          {collab && (
            <Section id="mp-collab" tone="s4" title="협업 신청" open={open["mp-collab"]} onToggle={() => toggle("mp-collab")}>
              {collab.content ?? (
                <>
                  <div className="mp-plans">
                    <h3>받은 협업 신청</h3>
                    <ul>
                      <li>
                        <span>〈신청자 이름〉</span>
                        <span>〈작품 · 역할 · 날짜〉 · 〈접수〉</span>
                      </li>
                    </ul>
                  </div>
                  <div className="mp-plans">
                    <h3>보낸 협업 신청</h3>
                    <ul>
                      <li>
                        <span>〈받는 사람〉</span>
                        <span>〈작품 · 역할 · 날짜〉 · 〈접수〉</span>
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </Section>
          )}
      </div>
    </div>
  );
}
