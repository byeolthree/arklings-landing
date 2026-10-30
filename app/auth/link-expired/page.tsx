import type { Metadata } from "next";
import Link from "next/link";
import { ResendBox } from "@/components/auth-forms";
import { CardHeading, PaperCard, PaperPage, primaryBtn } from "@/components/paper-card";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "확인 링크 안내", robots: { index: false, follow: false } };

export default async function LinkExpiredPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).next;
  const returnTo = safeNext(typeof raw === "string" ? raw : undefined);
  return (
    <PaperPage>
      <PaperCard>
        <CardHeading
          title="확인 링크를 쓸 수 없어요"
          lines={["링크가 만료되었거나 이미 사용되었을 수 있어요.", "아래에서 새 확인 메일을 받아 주세요."]}
        />
        <div className="mt-6 flex flex-col gap-4 md:mt-8">
          <ResendBox askEmail returnTo={returnTo} />
          <p className="text-center text-[12px] text-[#6f6469]">
            이미 확인을 마쳤다면 바로 로그인할 수 있어요.
          </p>
          <Link href={`/login?next=${encodeURIComponent(returnTo)}`} className={`${primaryBtn} w-full`}>
            로그인하러 가기
          </Link>
        </div>
      </PaperCard>
    </PaperPage>
  );
}
