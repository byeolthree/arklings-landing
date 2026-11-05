"use client";

import { useEffect, useRef } from "react";

// 대표 이미지도 영상과 같은 방식이다: 위아래도 좌우도 자르거나 늘리지 않고 통째로 보여 주고, 남는 곳은 같은 이미지를 흐리게 깔아 칸이 꽉 찬 것처럼 보이게 한다.
// 이미지 비율을 직접 재서 칸과 맞닿는 쪽(좌우 또는 위아래)만 8% 섞는다(data-seam). 칸보다 작은 이미지도 비율 그대로 칸에 맞게 키운다.
export function BlurImage({ src, className, label }: { src: string; className: string; label: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const fg = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const w = wrap.current;
    const im = fg.current;
    if (!w || !im) return;
    const update = () => {
      const iw = im.naturalWidth;
      const ih = im.naturalHeight;
      const cw = w.clientWidth;
      const ch = w.clientHeight;
      if (!iw || !ih || !cw || !ch) return;
      const scale = Math.min(cw / iw, ch / ih);
      im.style.width = `${Math.round(iw * scale)}px`;
      im.style.height = `${Math.round(ih * scale)}px`;
      const box = cw / ch;
      const ratio = iw / ih;
      w.dataset.seam = box > ratio * 1.005 ? "x" : box < ratio / 1.005 ? "y" : "none";
    };
    if (im.complete) update();
    im.addEventListener("load", update);
    const ro = new ResizeObserver(update);
    ro.observe(w);
    return () => {
      im.removeEventListener("load", update);
      ro.disconnect();
    };
  }, [src]);

  return (
    <div ref={wrap} className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="cr-hero-bg" src={src} alt="" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={fg} className="cr-hero-fg" src={src} alt={label} />
    </div>
  );
}
