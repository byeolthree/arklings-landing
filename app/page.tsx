import Link from "next/link";
import { CollaborationMedia } from "@/components/collaboration-media";
import { HeroCopy } from "@/components/hero-copy";
import { HeroMedia } from "@/components/hero-media";
import { WorkTitle } from "@/components/work-title";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const roles = [
  "이지안 — 대본 · 3화 초고 작성 중",
  "박서하 — 영상 · 오프닝 씬 테스트 중",
  "최다윤 — 자료 · 신라 복식 3건 연결",
];

const relatedDesktop = [
  { label: "신라 복식 고증", className: "bg-teal text-white" },
  { label: "경주 지형 자료", className: "bg-dusty text-white" },
  { label: "삼국사기 발췌", className: "bg-sage text-title" },
];

const relatedMobile = relatedDesktop.slice(0, 2).map((item, index) =>
  index === 1 ? { ...item, label: "경주 지형" } : item,
);

export default function HomePage() {
  return (
    <main className="flex w-full flex-col">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-20 px-4 pt-10 md:gap-40 md:px-10 lg:px-20">
      <section aria-labelledby="collab-heading" className="flex flex-col gap-4 md:gap-5">
        <div className="flex flex-col gap-px md:gap-1">
          <h1
            id="collab-heading"
            className="text-[15px] font-bold leading-[1.3] text-title md:text-[22px]"
          >
            지금 만들어지고 있어요
          </h1>
          <WorkTitle>악의 꽃 · 1화</WorkTitle>
        </div>
        <CollaborationMedia />
        <div className="flex items-center gap-2.5 md:gap-3">
          {/* SVG cluster from Figma — keep intrinsic size */}
          <img
            src="/images/avatars-desktop.svg"
            alt=""
            width={136}
            height={56}
            className="hidden h-14 w-[136px] md:block"
          />
          <img
            src="/images/avatars-mobile.svg"
            alt=""
            width={104}
            height={44}
            className="h-11 w-[104px] md:hidden"
          />
          <div className="flex flex-col gap-0.5 text-xs">
            <p className="font-medium leading-4 text-title">
              3명이 함께 만들고 있어요
            </p>
            <p className="leading-[18px] text-body">대본 · 영상 · 자료</p>
          </div>
        </div>
        <ul className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-3">
          {roles.map((role) => (
            <li
              key={role}
              className="flex w-fit items-center gap-2 whitespace-nowrap rounded-[20px] border border-border bg-background px-3.5 py-2 text-xs leading-[18px] text-body"
            >
              <span className="size-2 shrink-0 rounded-full bg-teal" aria-hidden />
              {role}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="idea-heading" className="flex flex-col gap-5 md:gap-6">
        <div className="flex flex-col gap-[3px] md:gap-1">
          <h2
            id="idea-heading"
            className="text-[15px] font-bold leading-[1.3] text-title md:text-[22px]"
          >
            당신의 아이디어를 아클링스에서 실현해 보세요
          </h2>
          <p className="text-[10px] leading-normal text-body md:text-sm">
            구상 중인 스토리에 시대적 배경을 구체화하고 사회 구조에 맞는 갈등을
            세팅해보세요
          </p>
        </div>
        <div className="flex flex-row items-stretch gap-6 max-md:flex-col max-md:gap-5">
          <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border bg-border p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] md:p-8">
            <div className="flex flex-col gap-3 md:gap-2">
              <p className="text-xs font-bold text-title md:text-lg">
                아이디어를 들려주세요
              </p>
              <div className="min-h-[90px] rounded-lg border border-[#b3b3b3] bg-white p-2.5 text-[11px] text-[#999] md:h-[300px] md:border-0 md:p-4 md:text-sm">
                예: 신라 화랑이 주인공인 첫사랑 이야기를 만들고 싶어요
              </div>
            </div>
            <div className="mt-3 flex justify-end md:mt-auto md:pt-6">
              <span
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-[35px] rounded-lg border-[1.5px] border-jaju bg-transparent px-5 text-[13px] font-bold text-jaju",
                )}
              >
                실현하기
              </span>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-[#e6e6e6] bg-background p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] md:p-8">
            <div className="flex flex-col gap-2.5 md:gap-2">
              <p className="text-xs font-bold text-title md:text-lg">
                아클링스가 보완한 설정
              </p>
              <p className="text-[11px] leading-normal text-body md:h-[300px] md:rounded-lg md:bg-white md:p-4 md:text-sm">
                예: 신라 화랑 조직의 실제 위계와 수련 방식을 반영해, 주인공이 속한
                낭도 조직과 경쟁·대립 관계를 구체화했습니다. 첫사랑 상대는 적대 세력
                낭도의 누이로 설정해 갈등 구조를 만들어보면 어떨까요?
              </p>
            </div>
            <div className="mt-2.5 flex flex-col gap-2.5 md:mt-auto">
              <p className="text-[11px] font-bold text-title md:translate-y-2">관련 자료</p>
              <ul className="flex flex-wrap gap-1.5 md:gap-2">
                {relatedDesktop.map((item) => (
                  <li
                    key={item.label}
                    className={cn(
                      "hidden whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] md:inline-flex",
                      item.className,
                    )}
                  >
                    {item.label}
                  </li>
                ))}
                {relatedMobile.map((item) => (
                  <li
                    key={item.label}
                    className={cn(
                      "inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] md:hidden",
                      item.className,
                    )}
                  >
                    {item.label}
                  </li>
                ))}
              </ul>
              <div className="flex justify-end">
                <Link
                  href="/apply"
                  className={cn(
                    buttonVariants(),
                    "h-8 rounded-lg bg-jaju px-5 text-[13px] font-bold text-white hover:bg-jaju/90",
                  )}
                >
                  협업 신청
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>

      <section
        aria-labelledby="hero-heading"
        className="mt-20 flex flex-col gap-3 md:mt-40 md:gap-4 md:pb-20"
      >
        <HeroMedia />
        <div
          id="hero-heading"
          className="sr-only"
        >
          아클링스 소개
        </div>
        <div className="mx-auto w-full max-w-[1440px] px-4 pb-10 md:px-10 lg:px-20">
          <HeroCopy />
        </div>
      </section>
    </main>
  );
}
