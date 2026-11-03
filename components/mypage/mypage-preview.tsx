"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SAMPLE_CREATORS } from "@/components/creators/sample-data";
import { PublishProfile, type HandleCheck, type SaveResult } from "@/components/planner/publish-profile";
import { ROLES } from "@/lib/collab";
import { GENRES, WorkEditor } from "@/components/mypage/work-editor";
import type { ProfileValues } from "@/lib/creator-rules";

export type ProfileState = "none" | "public" | "private";

// 로그인 결과 안내: 지금 마이페이지(app/mypage/page.tsx)가 쓰는 문구 그대로.
const MESSAGES: Record<string, { text: string; ok?: boolean }> = {
  linked: { text: "로그인 방법을 추가했어요.", ok: true },
  unlinked: { text: "로그인 방법을 해제했어요.", ok: true },
  link_failed: { text: "로그인 방법을 바꾸지 못했어요. 잠시 뒤에 다시 시도해 주세요." },
  unlink_last: { text: "로그인 방법이 하나뿐이라 해제할 수 없어요. 다른 방법을 먼저 추가해 주세요." },
};

const SECTIONS = [
  { id: "mp-basic", label: "기본 정보" },
  { id: "mp-creator", label: "크리에이터 등록" },
  { id: "mp-portfolio", label: "포트폴리오 등록" },
] as const;

const SAMPLE_PROFILE: Partial<ProfileValues> = {
  handle: "my-name",
  roles: ["script", "video"],
  about: "",
  channels: [],
  openToCollab: true,
};

function Section({
  id,
  tone,
  title,
  extra,
  open,
  onToggle,
  children,
}: {
  id: string;
  tone: "s1" | "s2" | "s3";
  title: string;
  extra?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`mp-sec ${tone}`} aria-labelledby={`${id}-h`}>
      <div className="wrap">
        <div className="mp-sh">
          <h2 id={`${id}-h`}>{title}</h2>
          {extra && <div className="mp-extra">{extra}</div>}
          <button type="button" className="btn btn-ghost mp-toggle" aria-expanded={open} aria-controls={`${id}-body`} onClick={onToggle}>
            {open ? "접기" : "펼치기"}
            <span className="mp-chev" aria-hidden="true" />
          </button>
        </div>
        <div id={`${id}-body`} className="mp-card" hidden={!open}>
          {children}
        </div>
      </div>
    </section>
  );
}

// 샘플 미리보기용: 실제 저장·로그인·DB와 연결되지 않는다. 디자인이 끝나면 지운다.
export function MypagePreview({ profile, msg, pending }: { profile: ProfileState; msg?: string; pending: boolean }) {
  const [open, setOpen] = useState({ "mp-basic": true, "mp-creator": true, "mp-portfolio": true });
  const [active, setActive] = useState<string>("mp-basic");
  const [saved, setSaved] = useState(false);
  const [showPending, setShowPending] = useState(pending);
  const [openWork, setOpenWork] = useState<[boolean, boolean]>([true, true]);
  const setWork = (i: 0 | 1, v: boolean) => setOpenWork((cur) => (i === 0 ? [v, cur[1]] : [cur[0], v]));
  const banner = msg ? MESSAGES[msg] : undefined;
  const exists = profile !== "none";
  const isPublic = profile === "public";

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
  }, []);

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
          <p className="mp-desc">〈설명 문구〉</p>
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
          </Section>

          <Section
            id="mp-creator"
            tone="s2"
            title="크리에이터 등록"
            extra={
              exists ? (
                <>
                  <Link className="mp-addr" href="/dev-preview/creators/jian-lee">
                    /creators/{SAMPLE_PROFILE.handle} ↗
                  </Link>
                  <span className={`mp-state ${isPublic ? "on" : ""}`}>{isPublic ? "공개 중" : "비공개"}</span>
                </>
              ) : undefined
            }
            open={open["mp-creator"]}
            onToggle={() => toggle("mp-creator")}
          >
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
              />
            </div>
            {saved && <p className="mp-sample">저장했어요(샘플).</p>}
          </Section>

          <Section id="mp-portfolio" tone="s3" title="포트폴리오 등록" open={open["mp-portfolio"]} onToggle={() => toggle("mp-portfolio")}>
            <div className="mp-top-row">
              <div className="mp-count">
                <span>〈작품 4 / 12〉</span>
                <span>〈파일 12MB / 20MB〉</span>
              </div>
              <button type="button" className="btn btn-primary">
                〈작품 추가〉
              </button>
            </div>

            <div className="mp-plans">
              <h3>내 기획안</h3>
              <ul>
                <li>
                  <span>〈기획안 제목〉</span>
                  <span>〈공개 중〉 · 열기</span>
                </li>
                <li>
                  <span>〈기획안 제목〉</span>
                  <span>〈공개하지 않음〉 · 열기</span>
                </li>
                <li className="off">
                  <span>〈기획안 제목〉</span>
                  <span>〈다른 작품에 붙음〉</span>
                </li>
              </ul>
            </div>

            <div className="mp-works">
              {openWork[0] ? (
                <WorkEditor isPublic={true} withPlan={true} roles={["video", "script"]} onFold={() => setWork(0, false)} />
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
                    <span className="mp-tag genre">{GENRES[1]}</span>
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
                <WorkEditor isPublic={false} withPlan={false} roles={["art_director"]} onFold={() => setWork(1, false)} />
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
          </Section>
      </div>
    </div>
  );
}
