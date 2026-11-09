"use client";

import Link from "next/link";
import { useRef } from "react";

type Item = { kind: "image"; src: string } | { kind: "video"; youtubeId: string };

// 작품 카드의 대표 이미지·영상. 랜딩 쇼츠 섹션처럼 좌우로 넘긴다(모바일은 밀어서, 큰 화면은 화살표로).
// items(실제 작품의 이미지·영상)를 주면 그것을, slides(글자 자리 표시)를 주면 자리 표시를 보여 준다. 누르면 작품 상세 창이 열린다.
export function WorkMedia({ href, slides = [], items = [] }: { href: string; slides?: string[]; items?: Item[] }) {
  const track = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };
  const count = items.length > 0 ? items.length : slides.length;
  return (
    <div className="cr-media">
      <div className="cr-media-track" ref={track} role="group" aria-label="대표 이미지와 영상">
        {items.length > 0
          ? items.map((it, i) => (
              <Link key={i} href={href} className="cr-slide has-img" aria-label={`${it.kind === "video" ? "영상" : "이미지"} (작품 열기)`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.kind === "video" ? `https://i.ytimg.com/vi/${it.youtubeId}/hqdefault.jpg` : it.src} alt="" loading="lazy" />
                {it.kind === "video" && <span className="cr-slide-play" aria-hidden="true">▶</span>}
              </Link>
            ))
          : slides.map((t, i) => (
              <Link key={i} href={href} className="cr-slide" aria-label={`${t} (작품 열기)`}>
                {t}
              </Link>
            ))}
      </div>
      {count > 1 && (
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
