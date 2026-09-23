"use client";

import { useEffect, useRef } from "react";

export function CollaborationMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const start = () => {
      video.play().catch(() => {});
    };

    start();
    video.addEventListener("loadeddata", start);
    return () => video.removeEventListener("loadeddata", start);
  }, []);

  return (
    <div className="overflow-hidden rounded-lg">
      <video
        ref={videoRef}
        className="aspect-[343/147] w-full object-cover md:aspect-auto md:h-[549px]"
        autoPlay
        loop
        muted
        playsInline
        poster="/images/collaboration-desktop.png"
        preload="auto"
        aria-label="웹툰 악의 꽃 1화 작업물. 전통 복식의 남성과 여성과 모란꽃이 함께 있는 장면"
      >
        <source src="/videos/akkkot-poster.mp4" type="video/mp4" />
        브라우저가 영상을 지원하지 않습니다.
      </video>
    </div>
  );
}
