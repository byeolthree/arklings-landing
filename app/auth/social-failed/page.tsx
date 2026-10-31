import type { Metadata } from "next";
import Link from "next/link";
import { CardHeading, PaperCard, PaperPage, outlineBtn, primaryBtn } from "@/components/paper-card";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "로그인 안내", robots: { index: false, follow: false } };

const COPY: Record<string, { title: string; lines: string[] }> = {
  cancelled: { title: "로그인을 취소했어요", lines: ["괜찮아요. 다시 시도하거나 다른 방법으로 계속할 수 있어요."] },
  linked_elsewhere: { title: "이미 다른 계정에 연결돼 있어요", lines: ["이 소셜 계정은 다른 아클링스 계정에 연결돼 있어요.", "그 계정으로 로그인하거나, 다른 방법으로 계속해 주세요."] },
  expired: { title: "로그인 시간이 지났어요", lines: ["로그인 화면에서 처음부터 다시 시도해 주세요."] },
  failed: { title: "로그인을 마치지 못했어요", lines: ["잠시 뒤에 다시 시도하거나, 이메일로 로그인해 주세요."] },
};

export default async function SocialFailedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const reasonRaw = typeof sp.reason === "string" ? sp.reason : "failed";
  const copy = COPY[reasonRaw] ?? COPY.failed;
  const returnTo = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  const q = `?next=${encodeURIComponent(returnTo)}`;
  return (
    <PaperPage>
      <PaperCard>
        <CardHeading title={copy.title} lines={copy.lines} />
        <div className="mt-6 flex flex-col gap-3 md:mt-8">
          <Link href={`/login${q}`} className={`${primaryBtn} w-full`}>
            로그인 화면으로 돌아가기
          </Link>
          <Link href={`/signup${q}`} className={`${outlineBtn} w-full`}>
            이메일로 가입하기
          </Link>
        </div>
      </PaperCard>
    </PaperPage>
  );
}
