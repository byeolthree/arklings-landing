import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreatorProfile } from "@/components/creators/creator-profile";
import { SAMPLE_CREATORS, sampleProfileOf, sampleWorksOf } from "@/components/creators/sample-data";
import type { CreatorCard } from "@/components/creators/types";

// 디자인 확인용 샘플 미리보기. 실제 DB와 연결되지 않고, 디자인이 끝나면 지운다.
export const metadata: Metadata = { title: "크리에이터 프로필 샘플 미리보기", robots: { index: false, follow: false } };

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// my-name = 샘플 마이페이지의 내 프로필(mine=public|private). 이름·글은 자리 표시다.
const MINE: CreatorCard = { handle: "my-name", name: "〈닉네임〉", roles: ["script", "video"], bio: "〈한 줄 소개〉\n〈경력〉\n〈참여한 일〉\n〈하고 싶은 협업〉", planCount: 2, openToCollab: true, genres: ["〈장르〉"], forms: ["long"], hero: "image", main: "logline", latest: { title: "〈작품 제목〉", logline: "〈로그라인〉", genres: ["〈장르〉"] } };

export default async function CreatorProfilePreviewPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const sp = await searchParams;
  const card = handle === MINE.handle ? MINE : SAMPLE_CREATORS.find((c) => c.handle === handle);
  if (!card) notFound();
  const mine = handle === MINE.handle ? (one(sp.mine) === "private" ? "private" : "public") : undefined;

  const state = one(sp.state); // empty = 올린 작품 0건, many = 12건(한도)
  // 주인 모습(?owner=1 또는 내 프로필): 「프로필 편집」·「포트폴리오 등록」 버튼과 작품마다 공개 스위치·손잡이. 세 번째 작품은 비공개로 둔다.
  const owner = !!mine || one(sp.owner) === "1";
  const works = (state === "empty" ? [] : sampleWorksOf(card, state === "many" ? 12 : card.planCount)).map((w, i) => ({ ...w, isPublic: !(owner && i === 2) }));
  const base = `/dev-preview/creators/${handle}`;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 max-w-[260px] rounded-lg border border-[#e8dfe3] bg-white/95 px-3 py-2 text-[11px] leading-snug text-[#2a2025] shadow-md">
        <strong>미리보기 도우미</strong> (사이트에 없는 상자)
        <br />
        가짜 데이터예요. 보기:{" "}
        <Link href={base} className="underline">기본</Link> ·{" "}
        <Link href={`${base}?owner=1`} className="underline">주인 모습</Link> ·{" "}
        <Link href={`${base}?state=many`} className="underline">작품 12건</Link> ·{" "}
        <Link href={`${base}?state=empty`} className="underline">작품 0건</Link> ·{" "}
        <Link href="/dev-preview/creators" className="underline">목록</Link>
        {mine && (
          <>
            <br />
            내 프로필 미리 보기:{" "}
            <Link href={`${base}?mine=public`} className={mine === "public" ? "font-bold underline" : "underline"}>공개 중</Link> ·{" "}
            <Link href={`${base}?mine=private`} className={mine === "private" ? "font-bold underline" : "underline"}>비공개</Link> ·{" "}
            <Link href={`/dev-preview/mypage?profile=${mine}`} className="underline">마이페이지로</Link>
          </>
        )}
      </div>
      <CreatorProfile
        creator={sampleProfileOf(card)}
        works={works}
        backHref="/dev-preview/creators"
        workHref={(id) => `/dev-preview/portfolio/${id}`}
        applyHref={`/dev-preview/collab?creator=${card.handle}&roles=${card.roles.join(",")}`}
        showApply={mine !== "private"}
        owner={owner ? { editHref: "/dev-preview/mypage#mp-creator", registerHref: "/dev-preview/mypage#mp-portfolio" } : undefined}
      />
    </>
  );
}
