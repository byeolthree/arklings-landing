import type { Metadata } from "next";
import "@/components/planner/planner.css";
import "@/components/mypage/mypage.css";
import "@/components/register/register.css";
import { CreatorProfile } from "@/components/creators/creator-profile";
import { CreatorProfileForm, PortfolioManager } from "@/components/mypage/creator-forms";
import { RegisterScreen } from "@/components/register/register-screen";
import { SiteNav } from "@/components/site-nav";
import { WorkDetail } from "@/components/creators/work-detail";
import { StatusBadge } from "@/components/status-badge";
import { RegisterHeader } from "@/components/register/register-steps";
import type { MyWork } from "@/lib/creators-mine";
import type { WorkCard } from "@/components/creators/types";

// 디자인 확인용: 진짜 화면 부품(마이페이지 접은 목록, 독립 등록 화면, 프로필 작품 섹션)에 가짜 값을 넣어 모양만 본다. 로그인이 없어서 버튼을 누르면 「로그인이 필요해요」가 나온다. 실제 사이트(production)에서는 열리지 않는다.
export const metadata: Metadata = { title: "진짜 부품 모양 확인(샘플)", robots: { index: false, follow: false } };

const LOG = "어느 날 〈사건〉이 벌어지자, 〈주인공〉은 〈장애물〉을 극복해야 〈목표〉를 달성할 수 있다. 그렇지 않으면 〈위험〉이 닥친다.";
const W = (id: string, title: string, pub: boolean, blocks: MyWork["blocks"], day: string, loglinePosition = 0): MyWork => ({
  id, title, logline: LOG, roles: ["script"], genres: ["드라마", "스릴러"], kind: "아웃라인", form: "long", publishedAt: day, updatedAt: day, loglinePosition, isPublic: pub, planId: null, blocks,
});
const works: MyWork[] = [
  W("11111111-1111-4111-8111-111111111111", "샘플 작품 하나", true, [{ id: "b1", kind: "video", youtubeId: "dQw4w9WgXcQ", sub: "티저" }, { id: "b1b", kind: "text", body: "시놉시스 글", sub: "시놉시스" }, { id: "b1c", kind: "image", fileName: "a.png", src: null }], "2026-11-07T03:00:00Z", 1),
  W("22222222-2222-4222-8222-222222222222", "샘플 작품 둘", true, [{ id: "b2", kind: "text", body: "글" }], "2026-11-05T03:00:00Z"),
  W("33333333-3333-4333-8333-333333333333", "샘플 작품 셋(비공개)", false, [], "2026-11-02T03:00:00Z"),
];
const cards: WorkCard[] = works.map((w, i) => ({ id: w.id, title: w.title, logline: w.logline, roles: w.roles, genres: w.genres, kind: "아웃라인", form: "long", publishedAt: w.publishedAt, isPublic: w.isPublic, media: i === 0 ? [{ kind: "video", youtubeId: "dQw4w9WgXcQ" }] : [] }));

export default async function RealPartsPreview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const part = typeof sp.part === "string" ? sp.part : "list";
  return (
    <div className="mp rg">
      <p style={{ padding: "8px 16px", fontSize: 12 }}>샘플: 진짜 부품에 가짜 값. 보기: ?part=list · ?part=register · ?part=profile · ?part=header · ?part=edit · ?part=detail · ?part=hero</p>
      {part === "header" && (
        <div style={{ minHeight: 420, background: "#000" }}>
          <SiteNav loggedIn newCount={2} notices={[{ id: "n1", text: "〈신청자 이름〉님이 「악의 꽃」에 협업을 신청했어요", when: "오늘 14:20" }, { id: "n2", text: "〈신청자 이름〉님이 「사다함의 꿈」에 협업을 신청했어요", when: "어제 18:05" }]} />
        </div>
      )}
      {part === "list" && (
        <section className="mp-sec s3">
          <div className="wrap">
            <div className="mp-sh"><h2>포트폴리오 등록</h2></div>
            <div className="mp-card">
              <PortfolioManager works={works} usedBytes={12 * 1024 * 1024} hasProfile nickname="별뜨리" />
            </div>
          </div>
        </section>
      )}
      {part === "status" && (
        <div style={{ display: "flex", gap: 8, padding: 24 }}>
          {(["received", "reviewing", "accepted", "rejected"] as const).map((x) => (
            <StatusBadge key={x} status={x} />
          ))}
        </div>
      )}
      {part === "hero" && (
        <section className="mp-sec s2">
          <div className="wrap">
            <div className="mp-sh"><h2>크리에이터 등록</h2></div>
            <div className="mp-card">
              <CreatorProfileForm profile={{ handle: "sample", roles: ["video"], bio: "", channels: [], openToCollab: true, isPublic: false, hero: { kind: "image", bytes: 2 * 1024 * 1024, src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' fill='%23e8dfe3'/%3E%3C/svg%3E" } }} />
            </div>
          </div>
        </section>
      )}
      {part === "detail" && (
        <WorkDetail work={{ title: "샘플 작품 하나", authorName: "별뜨리", publishedAt: "2026-11-07T03:00:00Z", roles: ["script"], genres: ["드라마"], logline: LOG, loglinePosition: 1, blocks: [{ id: "x1", kind: "video", youtubeId: "dQw4w9WgXcQ", sub: "티저" }, { id: "x2", kind: "text", body: "시놉시스 글(로그라인 뒤)" }, { id: "x3", kind: "text", body: "둘째 글" }] }} closeHref="/dev-preview/real-parts?part=list" />
      )}
      {part === "edit" && (
        <>
          <RegisterHeader title="포트폴리오 등록" current="포트폴리오 등록" />
          <div className="rg-main"><div className="rg-wrap"><RegisterScreen profilePublic={false} works={works} usedBytes={12 * 1024 * 1024} nickname="별뜨리" openWorkId={works[0].id} /></div></div>
        </>
      )}
      {part === "register" && (
        <>
          <RegisterHeader title="포트폴리오 등록" current="포트폴리오 등록" />
          <div className="rg-main"><div className="rg-wrap"><RegisterScreen profilePublic={false} works={works} usedBytes={12 * 1024 * 1024} nickname="별뜨리" openWorkId={null} /></div></div>
        </>
      )}
      {part === "profile" && (
        <CreatorProfile creator={{ handle: "sample", name: "별뜨리", roles: ["video"], bio: "샘플 소개", channels: [{ label: "인스타그램", url: "https://example.com" }, { label: "유튜브", url: "https://example.com" }], openToCollab: true }} works={cards} backHref="/creators" workHref={(id) => `/portfolio/${id}`} owner={{ editHref: "/mypage#mp-creator", registerHref: "/portfolio/new" }} />
      )}
    </div>
  );
}
