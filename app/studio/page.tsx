import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { WorkTitle } from "@/components/work-title";
import { studioWorks } from "@/lib/studio-works";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "스튜디오",
  description: "아클링스에서 지금 만들어지고 있는 이야기들",
};

export default function StudioPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-10 md:gap-8 md:px-20 md:pb-20 md:pt-10">
      <div className="flex flex-col gap-3 md:gap-4">
        <h1 className="font-sans text-lg font-bold text-title md:text-2xl">
          스튜디오 — 지금 만들어지고 있는 이야기들
        </h1>
        <div className="flex gap-2 md:gap-3" aria-hidden="true">
          {["역할", "진행단계", "나라"].map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-[20px] border border-[#8c8c8c] px-3 py-2 text-xs text-title md:px-3.5 md:text-[13px]"
            >
              {label}
              <span className="text-[10px] text-[#808080] md:text-[11px]">⌄</span>
            </span>
          ))}
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
        {studioWorks.map((work) => (
          <li key={work.title} className="flex flex-col gap-2 md:gap-2.5">
            <div
              className="h-40 rounded-lg border border-[#8c8c8c] bg-background md:h-[200px]"
              role="img"
              aria-label={`${work.title} 이미지 자리`}
            />
            <WorkTitle>{work.title}</WorkTitle>
            <div className="flex gap-2">
              {work.badges.map((badge) => (
                <Badge
                  key={badge.label}
                  className={cn(
                    "h-auto rounded-xl border-0 px-3 py-2 text-[11px] font-normal",
                    badge.className,
                  )}
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
