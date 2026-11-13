"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// 크리에이터 상세의 협업 신청 아이콘 버튼(2026-11-13 아키텍터 지시).
// 대표 화면의 소리 버튼 바로 위에, 소리 버튼과 같은 크기(44×44)로 놓고, 화면에 고정해서 스크롤해도 처음 그 자리에 계속 떠 있다.
// 자리는 페이지 맨 위에서 본 대표 화면 아래 끝을 기준으로 잰다. 화면이 낮아서 그 자리가 화면 밖이면 화면 아래쪽 안으로 끌어올린다.
export function CollabFab({ href }: { href: string }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  useEffect(() => {
    const place = () => {
      const hero = document.querySelector<HTMLElement>(".cr .cr-hero");
      if (!hero) return setPos(null);
      const w = window.innerWidth;
      const right = w >= 1024 ? 80 : w >= 768 ? 40 : 16; // 소리 버튼과 같은 오른쪽 여백
      const soundBottom = w >= 768 ? 28 : 16; // 소리 버튼의 아래 여백
      const heroBottom = hero.getBoundingClientRect().bottom + window.scrollY; // 페이지 맨 위에서 본 대표 화면 아래 끝
      const top = heroBottom - soundBottom - 44 - 10 - 44; // 소리 버튼 위로 10 띄운 자리
      setPos({ top: Math.min(top, window.innerHeight - 44 - 16), right });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);
  if (!pos) return null;
  return (
    <Link href={href} className="cr-fab" aria-label="이 크리에이터에게 협업 신청" title="협업 신청" style={{ top: pos.top, right: pos.right }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7z" />
      </svg>
    </Link>
  );
}
