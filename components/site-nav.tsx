"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions/auth";

// 랜딩(public/landing.html)의 상단 메뉴와 같은 모양. 가운데 메뉴 글자 중 연결된 화면이 있는 것만 링크(지금은 「크리에이터」), 나머지는 글자로만 둔다.
const MENU: { label: string; href?: string }[] = [
  { label: "킹덤" },
  { label: "스튜디오" },
  { label: "크리에이터", href: "/creators" },
  { label: "라이브러리" },
  { label: "커뮤니티" },
];

export type NavNotice = { id: string; text: string; when: string };

type Drop = "plus" | "person" | "bell" | null;

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...stroke}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const PersonIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...stroke}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </svg>
);
const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...stroke}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
  </svg>
);

// 로그인하면 아이콘 셋(＋ · 사람 · 종), 아니면 ＋와 사람 둘. 종의 개수와 목록은 서버가 읽은 새 협업 신청(SiteHeader)이다.
export function SiteNav({ loggedIn, newCount, notices, isAdmin = false }: { loggedIn: boolean; newCount: number | null; notices: NavNotice[]; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState<Drop>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);

  const isIn = loggedIn;

  // 크리에이터 목록·프로필과 그 사람의 기획안 상세에 있을 때 메뉴의 「크리에이터」를 현재 위치로 보여 준다.
  const onCreators = pathname.startsWith("/creators") || pathname.startsWith("/portfolio") || pathname.startsWith("/dev-preview/creators") || pathname.startsWith("/dev-preview/portfolio/");
  const hrefOf = (href: string) => href;

  // 랜딩처럼 아래로 내리면 메뉴 아래에 옅은 선이 생긴다.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 드롭다운은 바깥을 누르거나 Esc를 누르면 닫힌다.
  useEffect(() => {
    if (!drop) return;
    const onDown = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setDrop(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrop(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [drop]);

  const close = () => setOpen(false);
  const toggleDrop = (d: Exclude<Drop, null>) => {
    setOpen(false);
    setDrop((cur) => (cur === d ? null : d));
  };
  const shut = () => setDrop(null);

  return (
    <header className={`lk-header${scrolled ? " scrolled" : ""}`} id="top">
      <div className="lk-wrap lk-nav" ref={navRef}>
        <button
          className="lk-burger"
          type="button"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open}
          aria-controls="lk-menu"
          onClick={() => {
            setDrop(null);
            setOpen((v) => !v);
          }}
        >
          <i />
          <i />
          <i />
        </button>
        <Link className="lk-logo" href="/">
          Arklings
        </Link>
        <nav className="lk-nav-links" aria-label="주요 메뉴">
          {MENU.map((m) =>
            m.href ? (
              <Link key={m.label} href={hrefOf(m.href)} aria-current={onCreators ? "page" : undefined}>
                {m.label}
              </Link>
            ) : (
              <span key={m.label}>{m.label}</span>
            ),
          )}
        </nav>

        <div className="lk-nav-right lk-icons">
          {/* ＋ : 로그인하면 등록할 곳 드롭다운, 로그아웃이면 로그인 화면으로 */}
          <div className="lk-ico-wrap">
            {isIn ? (
              <button type="button" className="lk-ico lk-ico-fill" aria-label="등록하기" aria-haspopup="menu" aria-expanded={drop === "plus"} onClick={() => toggleDrop("plus")}>
                <PlusIcon />
              </button>
            ) : (
              <Link href="/login" className="lk-ico lk-ico-fill" aria-label="등록하기(로그인이 필요해요)">
                <PlusIcon />
              </Link>
            )}
            {drop === "plus" && (
              <div className="lk-drop" role="menu" aria-label="등록할 곳">
                {MENU.map((m) =>
                  m.href ? (
                    <Link key={m.label} role="menuitem" href="/portfolio/new" onClick={shut} aria-current={onCreators ? "page" : undefined}>
                      {m.label}
                    </Link>
                  ) : (
                    <span key={m.label} role="presentation">
                      {m.label}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>

          {/* 사람 : 마이페이지 메뉴(로그인) 또는 로그인·회원가입(로그아웃) */}
          <div className="lk-ico-wrap">
            <button type="button" className="lk-ico" aria-label={isIn ? "마이페이지" : "로그인·회원가입"} aria-haspopup="menu" aria-expanded={drop === "person"} onClick={() => toggleDrop("person")}>
              <PersonIcon />
            </button>
            {drop === "person" && (
              <div className="lk-drop" role="menu">
                {isIn ? (
                  <>
                    <Link role="menuitem" href="/mypage" onClick={shut}>
                      기본 정보
                    </Link>
                    <Link role="menuitem" href="/portfolio/new?step=profile" onClick={shut}>
                      프로필 등록
                    </Link>
                    <Link role="menuitem" href="/portfolio/new" onClick={shut}>
                      포트폴리오 등록
                    </Link>
                    <Link role="menuitem" href="/mypage/collab" onClick={shut}>
                      협업 신청
                    </Link>
                    {isAdmin && (
                      <Link role="menuitem" href="/admin" onClick={shut}>
                        운영자
                      </Link>
                    )}
                    <hr />
                    <form action={signOut}>
                      <button type="submit" role="menuitem">
                        로그아웃
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link role="menuitem" href="/login" onClick={shut}>
                      로그인
                    </Link>
                    <Link role="menuitem" href="/signup" onClick={shut}>
                      회원가입
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 종 : 로그인했을 때만. 새 협업 신청 알림 */}
          {isIn && (
            <div className="lk-ico-wrap">
              <button type="button" className="lk-ico" aria-label={newCount ? `알림 ${newCount}개` : "알림"} aria-haspopup="menu" aria-expanded={drop === "bell"} onClick={() => toggleDrop("bell")}>
                <BellIcon />
                {newCount ? (
                  <span className="lk-badge" aria-hidden="true">
                    {newCount > 9 ? "9+" : newCount}
                  </span>
                ) : null}
              </button>
              {drop === "bell" && (
                <div className="lk-drop lk-drop-bell" role="menu" aria-label="알림">
                  <p className="lk-drop-title">알림</p>
                  {notices.length === 0 && <p className="lk-drop-empty">새 협업 신청이 없어요.</p>}
                  <ul>
                    {notices.map((n) => (
                      <li key={n.id}>
                        <Link role="menuitem" href={`/collab/${n.id}`} onClick={shut}>
                          <span>{n.text}</span>
                          <small>{n.when}</small>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link role="menuitem" className="lk-drop-all" href="/collab" onClick={shut}>
                    받은 협업 신청 모두 보기
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <nav className={`lk-menu${open ? " open" : ""}`} id="lk-menu" aria-label="모바일 메뉴" aria-hidden={!open}>
        {MENU.map((m) =>
          m.href ? (
            <Link key={m.label} href={hrefOf(m.href)} onClick={close} tabIndex={open ? 0 : -1} aria-current={onCreators ? "page" : undefined}>
              {m.label}
            </Link>
          ) : (
            <span key={m.label}>{m.label}</span>
          ),
        )}
      </nav>
    </header>
  );
}
