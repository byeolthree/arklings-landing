import type { Metadata } from "next";
import Link from "next/link";
import { CreatorList } from "@/components/creators/creator-list";
import { SAMPLE_CREATORS, SAMPLE_PAGE_SIZE } from "@/components/creators/sample-data";

// 디자인 확인용 샘플 미리보기. 실제 DB와 연결되지 않고, 디자인이 끝나면 지운다.
export const metadata: Metadata = { title: "크리에이터 목록 샘플 미리보기", robots: { index: false, follow: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CreatorsPreviewPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const state = one(sp.state); // empty = 크리에이터가 하나도 없음
  const requested = Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1);

  const all = state === "empty" ? [] : SAMPLE_CREATORS;
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / SAMPLE_PAGE_SIZE));
  const from = (requested - 1) * SAMPLE_PAGE_SIZE;
  const cards = all.slice(from, from + SAMPLE_PAGE_SIZE);

  const q = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(state ? { state } : {}), ...extra });
    const s = p.toString();
    return `/dev-preview/creators${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <div className="border-b border-[#e8dfe3] bg-[#fdf6e7] px-4 py-2 text-[12px] text-[#2a2025]">
        <strong>샘플 미리보기</strong> · 이름과 글은 모두 가짜이고 실제 DB와 연결되지 않아요. 보기:{" "}
        <Link href="/dev-preview/creators" className="underline">목록</Link> ·{" "}
        <Link href="/dev-preview/creators?page=2" className="underline">2쪽</Link> ·{" "}
        <Link href="/dev-preview/creators?page=9" className="underline">쪽 번호가 너무 큼</Link> ·{" "}
        <Link href="/dev-preview/creators?state=empty" className="underline">크리에이터 없음</Link>
      </div>
      <CreatorList
        cards={cards}
        total={total}
        page={requested}
        pages={pages}
        profileHref={(h) => `/dev-preview/creators/${h}`}
        pageHref={(p) => q(p > 1 ? { page: String(p) } : {})}
      />
    </>
  );
}
