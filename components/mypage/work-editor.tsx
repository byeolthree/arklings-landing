"use client";

import { useState } from "react";
import { GENRES } from "@/components/creators/genres";
import { ROLES, type Role } from "@/lib/collab";

// 샘플 미리보기용: 펼친 작품 카드(배치도 I). 저장·올리기와 연결되지 않는다.
const LOGLINE_LABEL = "로그라인 (이미지, 영상 담당 크리에이터는 컨셉 등 기획을 소개해주세요)";
const LOGLINE_HINT = "어느 날 〈사건〉이 벌어지자, 〈주인공〉은 〈장애물〉을 극복해야 〈목표〉를 달성할 수 있다. 그렇지 않으면 〈위험〉이 닥친다.";

type Kind = "text" | "image" | "video";
const FOLDABLE: Kind[] = ["image", "video"];
const ADD: { kind: Kind; label: string }[] = [
  { kind: "text", label: "문서" },
  { kind: "image", label: "이미지" },
  { kind: "video", label: "영상" },
];

function Tools({ first, last }: { first: boolean; last: boolean }) {
  return (
    <div className="we-tools">
      <button type="button" className="we-mini" aria-label="위로" disabled={first}>↑</button>
      <button type="button" className="we-mini" aria-label="아래로" disabled={last}>↓</button>
      <button type="button" className="we-mini" aria-label="지우기">지우기</button>
    </div>
  );
}

function Element({ kind, first, last, folded, onFold }: { kind: Kind; first: boolean; last: boolean; folded: boolean; onFold: () => void }) {
  const foldable = FOLDABLE.includes(kind);
  return (
    <div className="we-el" tabIndex={0}>
      <span className="we-grip" aria-hidden="true">⠿</span>
      <div className="we-main">
        {foldable && (
          <button type="button" className="we-fold" aria-expanded={!folded} onClick={onFold}>
            {folded ? "▸ 펼치기" : "▾ 접기"}
          </button>
        )}
        {kind === "text" && <textarea className="we-text" rows={3} placeholder="〈문서〉" aria-label="문서" />}
        {kind === "image" && (folded ? <span className="we-line">이미지 〈파일 이름〉</span> : <div className="we-media">〈이미지〉</div>)}
        {kind === "video" && (folded ? <span className="we-line">영상 〈파일 이름〉</span> : <div className="we-media">〈영상〉</div>)}
      </div>
      <Tools first={first} last={last} />
    </div>
  );
}

export function WorkEditor({ isPublic, roles, onFold }: { isPublic: boolean; roles: Role[]; onFold: () => void }) {
  const [order] = useState<Kind[]>(isPublic ? ["text", "image", "video"] : ["text", "image"]);
  const [folded, setFolded] = useState<Partial<Record<Kind, boolean>>>({ video: true });
  const [pickRoles, setPickRoles] = useState(false);
  const [myRoles, setMyRoles] = useState<Role[]>(roles);
  const [genres, setGenres] = useState<number[]>([0, 1]);
  const [pub, setPub] = useState(isPublic);

  return (
    <div className="mp-work we">
      <div className="we-top">
        <span className="we-state">{pub ? "〈공개 중〉" : "〈공개하지 않음〉"}</span>
        <button type="button" className="btn btn-ghost" onClick={() => setPub(!pub)}>
          {pub ? "포트폴리오에서 내리기" : "포트폴리오에 올리기"}
        </button>
        <button type="button" className="btn btn-ghost we-close" onClick={onFold}>접기 ▴</button>
      </div>

      <div className="we-head">
        <input className="we-title" type="text" placeholder="〈작품 제목〉" aria-label="작품 제목" />
        <p className="we-by">〈닉네임〉 · 〈게시일〉</p>
        <div className="we-tags">
          {myRoles.map((r) => (
            <span key={r} className="mp-tag">{ROLES[r]}</span>
          ))}
          <button type="button" className="we-mini" aria-expanded={pickRoles} aria-label="역할 고르기" onClick={() => setPickRoles(!pickRoles)}>+</button>
        </div>
        {pickRoles && (
          <div className="we-pick" role="group" aria-label="역할">
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <button key={r} type="button" className="opt" aria-pressed={myRoles.includes(r)} onClick={() => setMyRoles(myRoles.includes(r) ? myRoles.filter((x) => x !== r) : [...myRoles, r])}>
                {ROLES[r]}
              </button>
            ))}
          </div>
        )}
        <div className="we-pick" role="group" aria-label="장르">
          {GENRES.map((g, i) => (
            <button key={i} type="button" className="opt" aria-pressed={genres.includes(i)} onClick={() => setGenres(genres.includes(i) ? genres.filter((x) => x !== i) : [...genres, i])}>
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="we-logline">
        <label>
          <span className="we-label">{LOGLINE_LABEL}</span>
          <textarea className="we-text" rows={3} placeholder={LOGLINE_HINT} />
        </label>
      </div>

      <div className="we-body">
        {order.map((k, i) => (
          <div key={k}>
            <div className="we-gap"><button type="button" className="we-mini" aria-label="여기에 요소 넣기">+</button></div>
            <Element kind={k} first={i === 0} last={i === order.length - 1} folded={!!folded[k]} onFold={() => setFolded({ ...folded, [k]: !folded[k] })} />
          </div>
        ))}
        <div className="we-add">
          <span>추가</span>
          {ADD.map((a) => (
            <button key={a.kind} type="button" className="btn btn-ghost">+ {a.label}</button>
          ))}
        </div>
      </div>

      <div className="we-foot">
        <button type="button" className="btn btn-ghost">미리 보기</button>
        <button type="button" className="btn btn-ghost" onClick={onFold}>취소</button>
        <button type="button" className="btn btn-ghost we-del">삭제</button>
        <button type="button" className="btn btn-primary">저장</button>
      </div>
    </div>
  );
}
