import type { Metadata } from "next";
import { ApplyForm } from "@/components/apply-form";

export const metadata: Metadata = {
  title: "협업 신청",
  description:
    "어떤 목적으로 오셨는지, 무엇이 필요한지 알려주세요. 검토 후 연락드립니다.",
};

export default function ApplyPage() {
  return (
    <main className="flex w-full justify-center px-4 pb-12 pt-8 md:pb-[140px] md:pt-[100px]">
      <ApplyForm />
    </main>
  );
}
