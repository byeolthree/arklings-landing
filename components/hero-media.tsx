export function HeroMedia() {
  return (
    <div className="w-full">
      <video
        className="hidden h-[719px] w-full object-cover md:block"
        autoPlay
        loop
        muted
        playsInline
        poster="/images/hero-poster.png"
        width={1440}
        height={719}
        preload="metadata"
        aria-label="아클링스 소개 영상"
      >
        <source src="/videos/arklings-intro.mp4" type="video/mp4" />
        브라우저가 영상을 지원하지 않습니다.
      </video>
      <video
        className="aspect-[3840/2156] w-full object-cover md:hidden"
        autoPlay
        loop
        muted
        playsInline
        poster="/images/hero-mobile.png"
        width={343}
        height={193}
        preload="metadata"
        aria-label="아클링스 소개 영상"
      >
        <source src="/videos/arklings-intro.mp4" type="video/mp4" />
        브라우저가 영상을 지원하지 않습니다.
      </video>
    </div>
  );
}
