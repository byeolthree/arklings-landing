import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreatorProfile } from "@/components/creators/creator-profile";
import { SAMPLE_CREATORS, SAMPLE_PROFILE_PAGE_SIZE, sampleProfileOf, samplePlansOf } from "@/components/creators/sample-data";

// 디자인 확인용 샘플 미리보기. 실제 DB와 연결되지 않고, 디자인이 끝나면 지운다.
export const metadata: Metadata = { title: "크리에이터 프로필 샘플 미리보기", robots: { index: false, follow: false } };

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CreatorProfilePreviewPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const sp = await searchParams;
  const card = SAMPLE_CREATORS.find((c) => c.handle === handle);
  if (!card) notFound();

  const state = one(sp.state); // empty = 공개한 기획안 0건, many = 쪽 나눔 확인용으로 14건
  const requested = Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1);
  const all = state === "empty" ? [] : samplePlansOf(state === "many" ? { ...card, planCount: 14 } : card);
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / SAMPLE_PROFILE_PAGE_SIZE));
  const from = (requested - 1) * SAMPLE_PROFILE_PAGE_SIZE;
  const plans = all.slice(from, from + SAMPLE_PROFILE_PAGE_SIZE);

  const base = `/dev-preview/creators/${handle}`;
  const href = (page: number) => {
    const p = new URLSearchParams();
    if (state) p.set("state", state);
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 max-w-[260px] rounded-lg border border-[#e8dfe3] bg-white/95 px-3 py-2 text-[11px] leading-snug text-[#2a2025] shadow-md">
        <strong>미리보기 도우미</strong> (사이트에 없는 상자)
        <br />
        가짜 데이터예요. 보기:{" "}
        <Link href={base} className="underline">기본</Link> ·{" "}
        <Link href={`${base}?state=many`} className="underline">기획안 14건</Link> ·{" "}
        <Link href={`${base}?state=empty`} className="underline">기획안 0건</Link> ·{" "}
        <Link href="/dev-preview/creators" className="underline">목록</Link>
      </div>
      <CreatorProfile
        creator={sampleProfileOf(card)}
        plans={plans}
        total={total}
        page={requested}
        pages={pages}
        backHref="/dev-preview/creators"
        planHref={(id) => `/dev-preview/portfolio/${id}`}
        pageHref={href}
      />
    </>
  );
}
