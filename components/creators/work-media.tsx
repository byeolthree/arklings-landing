"use client";

import Link from "next/link";
import { useRef } from "react";

// 작품 카드의 대표 이미지·영상. 랜딩 쇼츠 섹션처럼 좌우로 넘긴다(모바일은 밀어서, 큰 화면은 화살표로).
// 샘플에는 올린 파일이 없어 자리 표시를 둔다. 누르면 작품 상세 창이 열린다.
export function WorkMedia({ href, slides }: { href: string; slides: string[] }) {
  const track = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="cr-media">
      <div className="cr-media-track" ref={track} role="group" aria-label="대표 이미지와 영상">
        {slides.map((t, i) => (
          <Link key={i} href={href} className="cr-slide" aria-label={`${t} (작품 열기)`}>
            {t}
          </Link>
        ))}
      </div>
      {slides.length > 1 && (
        <>
          <button type="button" className="cr-media-nav prev" aria-label="앞으로 넘기기" onClick={() => move(-1)}>
            ‹
          </button>
          <button type="button" className="cr-media-nav next" aria-label="뒤로 넘기기" onClick={() => move(1)}>
            ›
          </button>
        </>
      )}
    </div>
  );
}
