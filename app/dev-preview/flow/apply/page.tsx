import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaperPage } from "@/components/paper-card";
import { FlowHelper } from "@/components/flow/flow-helper";
import { creatorOf, itemOf } from "@/components/flow/sample";
import { ROLES, type Role } from "@/lib/collab";
import { ApplyForm } from "./apply-form";

// 디자인 확인용 샘플 미리보기(협업 신청 흐름 4단계). 목록·프로필·기획안 창·킹덤 화면 어디서 들어와도 받는 크리에이터·보고 온 기획안·역할이 미리 채워진다.
export const metadata: Metadata = { title: "협업 신청 흐름 샘플", robots: { index: false, follow: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function FlowApplyPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const c = creatorOf(one(sp.creator));
  if (!c) notFound();
  const item = itemOf(c, one(sp.plan));
  const r = one(sp.role);
  const role = r && r in ROLES ? (r as Role) : undefined;
  return (
    <>
      <FlowHelper />
      <PaperPage>
        <ApplyForm creator={c.handle} creatorName={c.name} plan={item ? { id: item.id, title: item.title } : undefined} defaultRole={role} />
      </PaperPage>
    </>
  );
}
