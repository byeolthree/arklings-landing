import type { Metadata } from "next";
import Link from "next/link";
import "@/components/planner/planner.css";
import "@/components/mypage/mypage.css";
import "@/components/register/register.css";
import { PortfolioEditor } from "@/components/register/portfolio-editor";
import { ProfileStep } from "@/components/register/profile-step";
import { RegisterHeader } from "@/components/register/register-steps";

// 디자인 확인용 샘플 미리보기(시안 01). 실제 로그인·DB와 연결되지 않고, 디자인이 끝나면 지운다.
export const metadata: Metadata = { title: "포트폴리오 등록 샘플 미리보기", robots: { index: false, follow: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const BASE = "/dev-preview/portfolio-register";

export default async function PortfolioRegisterPreviewPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const step = one(sp.step) === "profile" ? "profile" : "portfolio";
  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 max-w-[260px] rounded-lg border border-[#e8dfe3] bg-white/95 px-3 py-2 text-[11px] leading-snug text-[#2a2025] shadow-md">
        <strong>미리보기 도우미</strong> (사이트에 없는 상자)
        <br />
        가짜 데이터예요. 보기:{" "}
        <Link href={`${BASE}?step=profile`} className={step === "profile" ? "font-bold underline" : "underline"}>프로필 등록 단계</Link> ·{" "}
        <Link href={BASE} className={step === "portfolio" ? "font-bold underline" : "underline"}>포트폴리오 등록 단계</Link>
      </div>
      <div className="rg">
        {step === "profile" ? (
          <>
            <RegisterHeader title="크리에이터 프로필 등록" current="프로필 등록" hrefs={{ "포트폴리오 등록": BASE }} />
            <ProfileStep nextHref={BASE} />
          </>
        ) : (
          <>
            <RegisterHeader title="포트폴리오 등록" current="포트폴리오 등록" hrefs={{ "프로필 등록": `${BASE}?step=profile` }} />
            <div className="rg-main">
              <div className="rg-wrap">
                <PortfolioEditor />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
