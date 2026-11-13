"use client";

import { useEffect, useState } from "react";

// 탐색 카드 그림·영상 위 작품 제목. 화면이 열릴 때 한 번만 제목 자리(칸 아래쪽 35%)의 밝기를 재서,
// 어두우면 흰 글자(어두운 음영), 밝으면 제목색(흰 음영)으로 보인다(2026-11-13). 영상은 첫 장면(0.1초)으로 잰다.
// 다른 사이트 그림(유튜브 대표 그림)은 브라우저가 밝기를 읽지 못하게 막아서, 재지 못하면 제목색 그대로 둔다.
export function MediaTitle({ src, kind, title }: { src: string; kind: "image" | "video"; title: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let off = false;
    const measure = (el: CanvasImageSource, w: number, h: number) => {
      try {
        if (!w || !h) return;
        const c = document.createElement("canvas");
        c.width = 32;
        c.height = 12;
        const x = c.getContext("2d");
        if (!x) return;
        x.drawImage(el, 0, h * 0.65, w, h * 0.35, 0, 0, 32, 12);
        const d = x.getImageData(0, 0, 32, 12).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        if (!off) setDark(sum / (d.length / 4) < 140);
      } catch {
        // 밝기를 읽을 수 없는 그림이면 제목색 그대로
      }
    };
    if (kind === "image") {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => measure(im, im.naturalWidth, im.naturalHeight);
      im.src = src;
    } else {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.muted = true;
      v.preload = "auto";
      v.addEventListener("loadeddata", () => { v.currentTime = 0.1; }, { once: true });
      v.addEventListener("seeked", () => measure(v, v.videoWidth, v.videoHeight), { once: true });
      v.src = src;
    }
    return () => {
      off = true;
    };
  }, [src, kind]);
  return <span className={`cr-v2-title${dark ? " on-dark" : ""}`}>{title}</span>;
}
