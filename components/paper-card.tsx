// Figma 「편지 카드」: 흰 카드, 테두리 #e6e6e6, 모서리 16px, 그림자. 모바일은 안쪽 여백이 더 좁다.
export function PaperPage({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex flex-1 justify-center px-4 pb-16 pt-8 md:px-5 md:pb-[140px] md:pt-[100px]">
      <div className={`w-full ${wide ? "max-w-[720px]" : "max-w-[600px]"}`}>{children}</div>
    </div>
  );
}

export function PaperCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[#e6e6e6] bg-white px-6 py-8 shadow-[0_6px_24px_rgba(0,0,0,0.08)] md:p-14 md:shadow-[0_8px_32px_rgba(0,0,0,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeading({ title, lines, noIcon }: { title: string; lines?: string[]; noIcon?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center md:gap-2.5">
      {!noIcon && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/apply-envelope-desktop.svg" alt="" width={44} height={33} className="hidden md:block" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/apply-envelope-mobile.svg" alt="" width={36} height={27} className="md:hidden" />
        </>
      )}
      <h1 className="text-[20px] font-bold text-[#292126] md:text-[24px]">{title}</h1>
      {lines && (
        <p className="text-[12px] leading-normal text-[#574a4f] md:text-[13px]">
          {lines.map((l, i) => (
            <span key={i} className="block">
              {l}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

export const primaryBtn =
  "inline-flex items-center justify-center rounded-lg bg-jaju px-5 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60";
export const outlineBtn =
  "inline-flex items-center justify-center rounded-lg border border-jaju px-5 py-2 text-[13px] font-bold text-jaju hover:bg-jaju hover:text-white";
