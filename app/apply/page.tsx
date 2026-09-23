import type { Metadata } from "next";
import { ApplyForm } from "@/components/apply-form";

export const metadata: Metadata = {
  title: "협업 신청",
  description: "아클링스 협업 신청. 목적과 필요한 작업을 알려 주시면 검토 후 연락드립니다.",
};

export default function ApplyPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-10 md:gap-8 md:px-20 md:pb-20 md:pt-10">
      <h1 className="text-lg font-bold leading-[26px] text-title md:text-xl md:leading-7">
        협업 신청
      </h1>
      <p className="text-xs leading-[18px] text-body md:text-sm md:leading-[22px]">
        <span className="md:hidden">어떤 목적으로 오셨는지, 무엇이 필요한지 알려주세요.</span>
        <span className="hidden md:inline">
          어떤 목적으로 오셨는지, 무엇이 필요한지 알려주세요. 검토 후 연락드립니다.
        </span>
      </p>
      <ApplyForm />
    </main>
  );
}
