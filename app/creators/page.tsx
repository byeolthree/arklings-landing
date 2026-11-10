import type { Metadata } from "next";
import { Suspense } from "react";
import { CreatorList } from "@/components/creators/creator-list";
import { parseFilter, type CreatorFilter } from "@/components/creators/filter";
import { CreatorListSkeleton } from "@/components/creators/state-views";
import { toCreatorCard } from "@/lib/creator-cards";
import { CREATOR_PAGE_SIZE, listCreators } from "@/lib/creators";

export const metadata: Metadata = { title: "크리에이터", description: "아클링스에서 작품을 올린 크리에이터를 둘러보세요." };
export const dynamic = "force-dynamic"; // 공개를 끄면 바로 목록에서 빠지도록 열 때마다 새로 읽는다

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// 불러오는 중 모양은 이 페이지 안에서 보여 준다. app/creators/loading.tsx는 이 아래 모든 주소(/creators/<주소>)를 감싸 못 찾음 응답 코드를 200으로 굳히므로 없앤다.
export default function CreatorsPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<CreatorListSkeleton />}>
      <CreatorsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CreatorsContent({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const requested = Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1);
  const filter = parseFilter({ q: one(sp.q), role: one(sp.role), genre: one(sp.genre), form: one(sp.form), open: one(sp.open) });
  const { items, total } = await listCreators(filter, requested);
  const pages = Math.max(1, Math.ceil(total / CREATOR_PAGE_SIZE));

  const href = ({ page, q, role, genre, form, open }: Partial<CreatorFilter> & { page?: number }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (role) p.set("role", role);
    if (genre) p.set("genre", genre);
    if (form) p.set("form", form);
    if (open) p.set("open", "1");
    if (page && page > 1) p.set("page", String(page));
    const s = p.toString();
    return `/creators${s ? `?${s}` : ""}`;
  };

  return (
    <CreatorList
      cards={items.map(toCreatorCard)}
      total={total}
      page={requested}
      pages={pages}
      filter={filter}
      profileHref={(h) => `/creators/${h}`}
      pageHref={href}
      applyHref={(c) => `/collab/new?creator=${c.handle}`}
    />
  );
}
