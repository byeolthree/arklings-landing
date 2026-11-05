"use client";

import { useRef, useState } from "react";

// 프로필 맨 위 대표 영상. 영상은 위아래도 좌우도 자르거나 늘리지 않고 통째로 보여 주고, 남는 곳은 같은 영상을 흐리게 깔아 꽉 찬 것처럼 보이게 한다.
// 소리는 처음에 꺼져 있고(브라우저 자동 재생 규칙), 오른쪽 아래 버튼으로 켜고 끈다. 소리는 앞쪽 영상에서만 난다.
export function HeroVideo({ src }: { src: string }) {
  const fg = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const toggle = () => {
    const v = fg.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };
  return (
    <>
      <div className="cr-hero-media has-src">
        <video className="cr-hero-bg" src={src} muted autoPlay loop playsInline aria-hidden="true" />
        <video ref={fg} className="cr-hero-fg" src={src} muted autoPlay loop playsInline aria-label="대표 영상" />
      </div>
      <button type="button" className="cr-hero-sound" onClick={toggle} aria-pressed={!muted} aria-label={muted ? "소리 켜기" : "소리 끄기"}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
          {muted ? (
            <path d="M16 9.5l5 5M21 9.5l-5 5" />
          ) : (
            <>
              <path d="M15.5 9a4 4 0 0 1 0 6" />
              <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
            </>
          )}
        </svg>
      </button>
    </>
  );
}
