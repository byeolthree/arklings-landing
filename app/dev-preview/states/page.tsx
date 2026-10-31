import type { Metadata } from "next";
import Link from "next/link";
import { CreatorListSkeleton, CreatorProfileSkeleton, NotFoundView, PlanDetailSkeleton } from "@/components/creators/state-views";
import { ErrorPreview } from "./error-preview";

// 디자인 확인용 샘플 미리보기. 크리에이터 화면의 상태 화면(불러오는 중·오류·404)을 한 곳에서 본다. 디자인이 끝나면 지운다.
export const metadata: Metadata = { title: "상태 화면 샘플 미리보기", robots: { index: false, follow: false } };

const VIEWS: Record<string, { label: string; node: React.ReactNode }> = {
  "list-loading": { label: "목록 불러오는 중", node: <CreatorListSkeleton /> },
  "profile-loading": { label: "프로필 불러오는 중", node: <CreatorProfileSkeleton /> },
  "detail-loading": { label: "상세 불러오는 중", node: <PlanDetailSkeleton /> },
  error: { label: "오류", node: <ErrorPreview title="크리에이터를 불러오지 못했어요" /> },
  "creator-404": {
    label: "크리에이터 404",
    node: <NotFoundView title="찾을 수 없는 크리에이터예요" text="주소가 잘못되었거나, 공개한 기획안이 없는 크리에이터일 수 있어요." href="/dev-preview/creators" label="크리에이터 둘러보기" />,
  },
  "plan-404": {
    label: "기획안 404",
    node: <NotFoundView title="찾을 수 없는 기획안이에요" text="주소가 잘못되었거나, 공개가 끝난 기획안일 수 있어요." href="/dev-preview/creators" label="크리에이터 둘러보기" />,
  },
};

export default async function StatesPreviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.view) ? sp.view[0] : sp.view;
  const key = raw && raw in VIEWS ? raw : "list-loading";
  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 max-w-[300px] rounded-lg border border-[#e8dfe3] bg-white/95 px-3 py-2 text-[11px] leading-snug text-[#2a2025] shadow-md">
        <strong>미리보기 도우미</strong> (사이트에 없는 상자)
        <br />
        보기:{" "}
        {Object.entries(VIEWS).map(([k, v], i) => (
          <span key={k}>
            {i > 0 && " · "}
            <Link href={`/dev-preview/states?view=${k}`} className={k === key ? "font-bold underline" : "underline"}>
              {v.label}
            </Link>
          </span>
        ))}
      </div>
      {VIEWS[key].node}
    </>
  );
}
