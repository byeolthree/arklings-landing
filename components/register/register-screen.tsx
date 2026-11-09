"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PortfolioManager, WorkEditor, type WorkPreview } from "@/components/mypage/creator-forms";
import { setWorkPublic } from "@/app/actions/creators";
import { ROLES, type Role } from "@/lib/collab";
import { ROLE_TONE } from "@/components/creators/role-tone";
import { QUOTA_BYTES, WORK_LIMIT } from "@/lib/creator-rules";
import type { MyWork } from "@/lib/creators-mine";

const FRAME = "어느 날 〈사건〉이 벌어지자, 〈주인공〉은 〈장애물〉을 극복해야 〈목표〉를 달성할 수 있다. 그렇지 않으면 〈위험〉이 닥친다.";
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`;

function PreviewCard({ p, kind }: { p: WorkPreview; kind: "video" | "image" | "doc" | "logline" }) {
  return (
    <div className="rg-pcard">
      <p className="rg-pcard-title">{p.title || "〈제목〉"}</p>
      {kind === "logline" ? <p className="rg-pcard-log">{p.logline || FRAME}</p> : <div className="rg-pcard-media">{kind === "video" ? "영상" : kind === "doc" ? "문서" : "이미지"}</div>}
      <div className="rg-pcard-tags">
        {p.roles.length > 0 && (
          <ul className="rg-roles">
            {p.roles.map((r) => (
              <li key={r} className={`tone-${ROLE_TONE[r]}`}>
                {ROLES[r]}
              </li>
            ))}
          </ul>
        )}
        {p.genres.length > 0 && (
          <ul>
            {p.genres.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// 독립 포트폴리오 등록 화면(시안 01-C): 왼쪽은 진짜 저장되는 편집 칸, 오른쪽은 「포트폴리오 화면에 보일 카드」(편집하는 대로 바로 바뀐다).
export function RegisterScreen({ works, usedBytes, nickname, openWorkId, profileRoles, handle, profilePublic }: { works: MyWork[]; usedBytes: number; nickname: string; openWorkId: string | null; profileRoles?: Role[]; handle: string; profilePublic: boolean }) {
  const router = useRouter();
  // 접힌 목록(시안 02)이 처음 화면이다. 작품이 하나도 없으면 바로 등록 화면(시안 01 C)이고, 「접기」를 누르면 목록으로 돌아온다.
  const [current, setCurrent] = useState<string | "new" | null>(openWorkId && works.some((w) => w.id === openWorkId) ? openWorkId : works.length === 0 ? "new" : null);
  const [pubBusy, setPubBusy] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [preview, setPreview] = useState<WorkPreview>({ title: "", logline: "", genres: [], roles: [], top: "logline" });
  const cur = current && current !== "new" ? (works.find((w) => w.id === current) ?? null) : null;
  const other = preview.top === "logline" ? "video" : "logline";
  const topNote = `내 포트폴리오 ${works.length} / ${WORK_LIMIT} · 파일 ${mb(usedBytes)} / ${mb(QUOTA_BYTES)}`;

  return (
    <div className={`rg-grid${current === null ? " rg-list" : ""}`}>
      {current === null && <h2 className="rg-list-title">포트폴리오 등록</h2>}
      <section className={`rg-card${current === null ? " rg-card-list" : ""}`} aria-label="포트폴리오 등록">
        {current === null ? (
          <PortfolioManager works={works} usedBytes={usedBytes} hasProfile={true} nickname={nickname} onOpenNew={() => setCurrent("new")} onOpenEdit={(id) => setCurrent(id)} />
        ) : cur ? (
          <WorkEditor
            key={cur.id}
            work={cur}
            nickname={nickname}
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
            nickname={nickname}
            profileRoles={profileRoles}
            topNote={topNote}
            onClose={() => {
              setFormKey((k) => k + 1);
              setCurrent(works.length > 0 ? null : "new");
            }}
            onCreated={(id, allSaved) => {
              // 작품을 만들고 빠짐없이 저장됐으면 내 크리에이터 상세로 간다. 프로필이 비공개이거나 일부가 저장되지 않았으면 이 화면에 남아 이유를 보여 준다.
              if (allSaved && profilePublic) return router.push(`/creators/${handle}`);
              setCurrent(id);
              router.refresh();
            }}
            onPreview={setPreview}
          />
        )}
      </section>

      <aside className="rg-side" aria-label="포트폴리오 화면에 보일 카드" hidden={current === null}>
        <h2 className="rg-side-h">포트폴리오 화면에 보일 카드</h2>
        <div>
          <p className="rg-side-sub">맨 위가 {preview.top === "video" ? "영상" : preview.top === "image" ? "이미지" : preview.top === "doc" ? "문서" : "로그라인"}일 때 (지금 왼쪽 모습)</p>
          <PreviewCard p={preview} kind={preview.top} />
        </div>
        <div>
          <p className="rg-side-sub">맨 위가 {other === "video" ? "영상" : "로그라인"}일 때</p>
          <PreviewCard p={preview} kind={other} />
        </div>
        <p className="rg-side-note">역할은 프로필에서 가져옵니다(여기서 고르지 않음). 왼쪽 맨 위 요소를 끌어서 바꾸면 이 카드가 바로 바뀝니다.</p>
      </aside>
    </div>
  );
}
