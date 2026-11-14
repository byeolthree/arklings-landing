"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PortfolioManager, WorkEditor, type WorkPreview } from "@/components/mypage/creator-forms";
import { setWorkPublic } from "@/app/actions/creators";
import type { Role } from "@/lib/collab";
import { ExploreCard } from "@/components/creators/explore-card";
import type { CreatorCard } from "@/components/creators/types";
import "@/components/creators/creators.css";
import { QUOTA_BYTES, WORK_LIMIT } from "@/lib/creator-rules";
import type { MyWork } from "@/lib/creators-mine";

const FRAME = "어느 날 〈사건〉이 벌어지자, 〈주인공〉은 〈장애물〉을 극복해야 〈목표〉를 달성할 수 있다. 그렇지 않으면 〈위험〉이 닥친다.";
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`;

// 미리보기 카드: 탐색 화면과 같은 카드(ExploreCard)를 지금 편집 중인 값으로 그린다(2026-11-14). 링크는 없다.
function previewCard(p: WorkPreview, nickname: string, bio: string, openToCollab: boolean): CreatorCard {
  // 이미지·영상을 맨 위에 두고 파일까지 있을 때만 그것이 대표, 아니면 로그라인(문서는 문서 칸)
  const media = (p.top === "image" || p.top === "video") && Boolean(p.media);
  return {
    handle: "",
    name: nickname || "〈닉네임〉",
    roles: p.roles,
    bio: bio || undefined,
    planCount: 0,
    openToCollab,
    genres: p.genres,
    forms: [],
    latest: { title: p.title || "〈제목〉", logline: p.logline || FRAME, genres: p.genres },
    main: media ? "media" : "logline",
    hero: media ? p.media?.kind : undefined,
    heroSrc: media ? p.media?.src : undefined,
    mainFit: p.media?.fit,
    mainSub: media ? p.topLabel : undefined,
    docLabel: p.top === "doc" ? p.topLabel : undefined,
    docText: p.top === "doc" ? p.docText || "〈문서〉" : undefined,
  };
}

// 독립 포트폴리오 등록 화면(시안 01-C): 왼쪽은 진짜 저장되는 편집 칸, 오른쪽은 「포트폴리오 화면에 보일 카드」(편집하는 대로 바로 바뀐다).
export function RegisterScreen({ works, usedBytes, nickname, openWorkId, openNew = false, profileRoles, profilePublic, profileBio = "", profileOpen = false }: { works: MyWork[]; usedBytes: number; nickname: string; openWorkId: string | null; openNew?: boolean; profileRoles?: Role[]; profilePublic: boolean; profileBio?: string; profileOpen?: boolean }) {
  const router = useRouter();
  // 접힌 목록(시안 02)이 처음 화면이다. 작품이 하나도 없으면 바로 등록 화면(시안 01 C)이고, 「접기」를 누르면 목록으로 돌아온다.
  const [current, setCurrent] = useState<string | "new" | null>(openWorkId && works.some((w) => w.id === openWorkId) ? openWorkId : works.length === 0 || (openNew && works.length < WORK_LIMIT) ? "new" : null); // ?new=1(크리에이터 상세의 「포트폴리오 등록」)이면 새 등록 칸을 펼친 채로 연다
  const [pubBusy, setPubBusy] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [preview, setPreview] = useState<WorkPreview>({ title: "", logline: "", genres: [], roles: [], top: "logline" });
  const cur = current && current !== "new" ? (works.find((w) => w.id === current) ?? null) : null;
  const topNote = `내 포트폴리오 ${works.length} / ${WORK_LIMIT} · 파일 ${mb(usedBytes)} / ${mb(QUOTA_BYTES)}`;

  // 새 등록 화면을 펼쳤을 때도 목록 화면과 같은 자리에 「새 포트폴리오 등록」 바를 두고, 펼치기·접기 글자만 바뀐다(2026-11-13 아키텍터 지시).
  const closeNew = () => {
    setFormKey((k) => k + 1);
    setCurrent(works.length > 0 ? null : "new");
  };
  return (
    <>
    {current === "new" && (
      <div className="rg-grid rg-list">
        <h2 className="rg-list-title">포트폴리오 등록</h2>
      </div>
    )}
    <div className={`rg-grid${current === null ? " rg-list" : ""}`}>
      {current === null && <h2 className="rg-list-title">포트폴리오 등록</h2>}
      <section className={`rg-card${current === null ? " rg-card-list" : ""}`} aria-label="포트폴리오 등록">
        {current === "new" && (
          <div className="pf rg-newbar-in">
            <button type="button" className="pf-new is-open" aria-expanded={true} aria-label="내 포트폴리오 목록 보기" onClick={closeNew}>
              {/* 작품 수·파일 용량(왼쪽), 목록 보기(오른쪽) */}
              <span className="pf-new-note">{topNote}</span>
              <span className="pf-new-fold">
                <span className="pf-long">내 포트폴리오 목록 보기 ▴</span>
                <span className="pf-short">목록 보기 ▴</span>
              </span>
            </button>
          </div>
        )}
        {current === null ? (
          <PortfolioManager works={works} usedBytes={usedBytes} hasProfile={true} nickname={nickname} onOpenNew={() => setCurrent("new")} onOpenEdit={(id) => setCurrent(id)} />
        ) : cur ? (
          <WorkEditor
            key={cur.id}
            work={cur}
            profileRoles={profileRoles}
            topNote={topNote}
            busyOuter={pubBusy}
            onTogglePublic={async () => {
              setPubBusy(true);
              await setWorkPublic(cur.id, !cur.isPublic);
              setPubBusy(false);
              router.refresh();
            }}
            onClose={() => setCurrent(null)}
            onPreview={setPreview}
          />
        ) : (
          <WorkEditor
            key={`new${formKey}`}
            work={null}
            profileRoles={profileRoles}
            onClose={closeNew}
            onCreated={(id, allSaved) => {
              // 작품을 만들고 빠짐없이 저장됐으면 내 크리에이터 상세로 간다. 프로필이 비공개이거나 일부가 저장되지 않았으면 이 화면에 남아 이유를 보여 준다.
              if (allSaved && profilePublic) return router.push("/creators");
              setCurrent(id);
              router.refresh();
            }}
            onPreview={setPreview}
          />
        )}
      </section>

      <aside className="rg-side" aria-label="포트폴리오 화면에 보일 카드" hidden={current === null}>
        <h2 className="rg-side-h">포트폴리오 화면에 보일 카드</h2>
        <div className="cr rg-pcard-cr">
          <ExploreCard c={previewCard(preview, nickname, profileBio, profileOpen)} />
        </div>
        <p className="rg-side-note">크리에이터의 역할은 프로필에서 선택할 수 있습니다.</p>
      </aside>
    </div>
    </>
  );
}
