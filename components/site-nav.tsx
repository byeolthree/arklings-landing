"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/actions/auth";

// 랜딩(public/landing.html)의 상단 메뉴와 같은 모양. 가운데 메뉴 글자는 랜딩처럼 아직 연결된 화면이 없어 글자로만 둔다.
const MENU = ["킹덤", "스튜디오", "크리에이터", "라이브러리", "커뮤니티"];

export function SiteNav({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  // 로그인 화면에서 돌아올 곳. 로그인·가입 화면 자체에서는 붙이지 않는다.
  const loginHref =
    pathname === "/login" || pathname === "/signup" || pathname.startsWith("/auth/")
      ? "/login"
      : `/login?next=${encodeURIComponent(pathname)}`;

  // 랜딩처럼 아래로 내리면 메뉴 아래에 옅은 선이 생긴다.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setOpen(false);
  return (
    <header className={`lk-header${scrolled ? " scrolled" : ""}`} id="top">
      <div className="lk-wrap lk-nav">
        <Link className="lk-logo" href="/">
          Arklings
        </Link>
        <nav className="lk-nav-links" aria-label="주요 메뉴">
          {MENU.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </nav>
        <div className="lk-nav-right">
          {loggedIn ? (
            <>
              <Link href="/collab" className="lk-textlink">
                받은 협업 신청
              </Link>
              <Link href="/mypage" className="lk-textlink">
                마이페이지
              </Link>
              <form action={signOut} style={{ display: "contents" }}>
                <button type="submit" className="lk-textlink">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link href={loginHref} className="lk-textlink">
              로그인
            </Link>
          )}
          <Link className="lk-btn lk-btn-primary lk-nav-cta" href="/planner">
            기획안 만들기
          </Link>
          <button
            className="lk-burger"
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={open}
            aria-controls="lk-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <i />
            <i />
            <i />
          </button>
        </div>
      </div>
      <nav className={`lk-menu${open ? " open" : ""}`} id="lk-menu" aria-label="모바일 메뉴" aria-hidden={!open}>
        {MENU.map((m) => (
          <span key={m}>{m}</span>
        ))}
        {loggedIn ? (
          <>
            <Link href="/collab" onClick={close} tabIndex={open ? 0 : -1}>
              받은 협업 신청
            </Link>
            <Link href="/mypage" onClick={close} tabIndex={open ? 0 : -1}>
              마이페이지
            </Link>
            <form action={signOut} style={{ display: "contents" }}>
              <button type="submit" tabIndex={open ? 0 : -1}>
                로그아웃
              </button>
            </form>
          </>
        ) : (
          <Link href={loginHref} onClick={close} tabIndex={open ? 0 : -1}>
            로그인
          </Link>
        )}
        <Link href="/planner" onClick={close} tabIndex={open ? 0 : -1} style={{ color: "var(--jaju)", fontWeight: 700 }}>
          기획안 만들기
        </Link>
      </nav>
    </header>
  );
}
