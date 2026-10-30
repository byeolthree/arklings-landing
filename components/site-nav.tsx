"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/actions/auth";

const MENU = ["킹덤", "스튜디오", "크리에이터", "라이브러리", "커뮤니티"];

export function SiteNav({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // 로그인 화면에서 돌아올 곳. 로그인·가입 화면 자체에서는 붙이지 않는다.
  const loginHref =
    pathname === "/login" || pathname === "/signup" || pathname.startsWith("/auth/")
      ? "/login"
      : `/login?next=${encodeURIComponent(pathname)}`;
  return (
    <header className="border-b border-teal bg-background">
      <div className="mx-auto flex max-w-[1440px] items-center gap-8 px-4 py-4 md:px-20 md:py-6">
        <a href="/" className="text-[22px] font-bold leading-normal text-jaju md:text-[24px]">
          Arklings
        </a>
        {/* 데스크톱 메뉴 (시안의 킹덤·스튜디오 등은 아직 연결된 화면이 없어 글자로만 둔다) */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="주 메뉴">
          {MENU.map((m) => (
            <span key={m} className="text-[15px] text-[#574a4f]">
              {m}
            </span>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="hidden items-center gap-8 md:flex">
          {loggedIn ? (
            <>
              <Link href="/mypage" className="text-[15px] text-[#574a4f] hover:text-jaju">
                마이페이지
              </Link>
              <form action={signOut}>
                <button type="submit" className="text-[15px] text-[#574a4f] hover:text-jaju">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link href={loginHref} className="text-[15px] text-[#574a4f] hover:text-jaju">
              로그인
            </Link>
          )}
          <Link href="/collab/new" className="rounded-lg bg-jaju px-5 py-2 text-[13px] font-bold text-white hover:opacity-90">
            협업 신청
          </Link>
        </div>
        <button
          type="button"
          className="text-[18px] text-[#292126] md:hidden"
          aria-label="메뉴 열기"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
      </div>
      {open && (
        <div className="border-t border-[#e8dfe3] px-4 py-3 md:hidden">
          <ul className="space-y-3 text-[15px] text-[#574a4f]">
            {MENU.map((m) => (
              <li key={m}>{m}</li>
            ))}
            {loggedIn ? (
              <>
                <li>
                  <Link href="/mypage" onClick={() => setOpen(false)} className="text-jaju">
                    마이페이지
                  </Link>
                </li>
                <li>
                  <form action={signOut}>
                    <button type="submit" className="text-[#574a4f]">
                      로그아웃
                    </button>
                  </form>
                </li>
              </>
            ) : (
              <li>
                <Link href={loginHref} onClick={() => setOpen(false)} className="text-jaju">
                  로그인
                </Link>
              </li>
            )}
            <li>
              <Link href="/collab/new" onClick={() => setOpen(false)} className="font-bold text-jaju">
                협업 신청
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
