import type { Metadata } from "next";
import Link from "next/link";
import { PaperPage } from "@/components/paper-card";
import { SAMPLE_CREATORS, sampleDetailOf } from "@/components/creators/sample-data";
import { ROLES, type Role } from "@/lib/collab";
import { PreviewCollabForm } from "./preview-form";

// 디자인 확인용 샘플 미리보기. 협업 신청서가 받는 크리에이터·보고 온 기획안·역할을 미리 채운 모습만 본다. 아무것도 저장하지 않고, 디자인이 끝나면 지운다.
export const metadata: Metadata = { title: "협업 신청서 샘플 미리보기", robots: { index: false, follow: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CollabPreviewPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const creator = SAMPLE_CREATORS.find((c) => c.handle === one(sp.creator));
  const detail = sampleDetailOf(one(sp.plan) ?? "");
  const roles = (one(sp.roles) ?? "").split(",").filter((r): r is Role => r in ROLES);
  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 max-w-[260px] rounded-lg border border-[#e8dfe3] bg-white/95 px-3 py-2 text-[11px] leading-snug text-[#2a2025] shadow-md">
        <strong>미리보기 도우미</strong> (사이트에 없는 상자)
        <br />
        아무것도 저장하지 않아요. 보기:{" "}
        <Link href="/dev-preview/collab?creator=jian-lee&roles=script" className="underline">목록·프로필에서</Link> ·{" "}
        <Link href="/dev-preview/collab?creator=jian-lee&plan=sample-jian-lee-1&roles=script" className="underline">기획안 창에서</Link>
      </div>
      <PaperPage>
        <PreviewCollabForm
          creator={creator && !detail ? { handle: creator.handle, name: creator.name } : undefined}
          plan={detail ? { id: detail.id, title: detail.title, recipientName: detail.authorName } : undefined}
          prefillRoles={roles}
          cancelHref={creator ? `/dev-preview/creators/${creator.handle}` : "/dev-preview/creators"}
        />
      </PaperPage>
    </>
  );
}
