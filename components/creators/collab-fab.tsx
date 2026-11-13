"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// 크리에이터 상세의 협업 신청 아이콘 버튼(2026-11-13 아키텍터 지시).
// 대표 영상 아래 소개 글 줄 오른쪽(주인 버튼 자리)에 소리 버튼과 같은 크기(44×44)로 놓고, 화면에 고정해서 스크롤해도 처음 그 자리에 계속 떠 있다.
// 화면이 낮아서 그 자리가 화면 밖이면 화면 아래쪽 안으로 끌어올린다.
export function CollabFab({ href }: { href: string }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  useEffect(() => {
    // 자리: 대표 영상 아래 소개 글 줄 오른쪽(내 프로필의 「프로필 편집」·「포트폴리오 등록」 자리). 페이지 맨 위에서 본 그 자리에 화면 고정한다.
    const place = () => {
      const slot = document.querySelector<HTMLElement>(".cr .cr-fab-slot");
      if (!slot) return setPos(null);
      const r = slot.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const right = window.innerWidth - r.right;
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
