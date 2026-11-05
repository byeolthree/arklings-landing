"use client";

import { useEffect, useRef } from "react";

// 영상은 위아래도 좌우도 자르거나 늘리지 않고 통째로 보여 주고, 남는 곳은 같은 영상을 흐리게 깔아 칸이 꽉 찬 것처럼 보이게 한다.
// 영상 비율이 어떻든(가로형·세로형·정사각형·넓은 영화 비율) 영상과 흐린 배경이 만나는 가장자리를 부드럽게 섞는다:
// 칸보다 영상이 가로로 좁으면 좌우(data-seam="x"), 세로로 짧으면 위아래(data-seam="y")만 8% 폭으로 섞고, 딱 맞으면 섞지 않는다.
export function BlurVideo({ src, className, label, soundOn = false }: { src: string; className: string; label: string; soundOn?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const fg = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const w = wrap.current;
    const v = fg.current;
    if (!w || !v) return;
    const update = () => {
      if (!v.videoWidth || !v.videoHeight || !w.clientWidth || !w.clientHeight) return;
      const box = w.clientWidth / w.clientHeight;
      const vid = v.videoWidth / v.videoHeight;
      w.dataset.seam = box > vid * 1.005 ? "x" : box < vid / 1.005 ? "y" : "none";
    };
    update();
    v.addEventListener("loadedmetadata", update);
    const ro = new ResizeObserver(update);
    ro.observe(w);
    return () => {
      v.removeEventListener("loadedmetadata", update);
      ro.disconnect();
    };
  }, [src]);

  // 소리는 앞쪽 영상에서만 난다. 뒤의 흐린 영상은 늘 꺼져 있다.
  useEffect(() => {
    if (fg.current) fg.current.muted = !soundOn;
  }, [soundOn]);

  return (
    <div ref={wrap} className={className}>
      <video className="cr-hero-bg" src={src} muted autoPlay loop playsInline preload="metadata" aria-hidden="true" />
      <video ref={fg} className="cr-hero-fg" src={src} muted autoPlay loop playsInline preload="metadata" aria-label={label} />
    </div>
  );
}
