"use client";

import { useEffect, useState } from "react";
import { WorkEditor } from "@/components/mypage/work-editor";
import { ROLES, type Role } from "@/lib/collab";

// 샘플 미리보기용: 마이페이지 「포트폴리오 등록」 구역의 접은 모양(시안 02·07). 저장·순서 바꾸기·공개 켜고 끄기·삭제는 서버에 아직 없어서 이 화면 안에서만 움직인다.
type Rep = "티저 영상" | "컨셉 이미지" | "로그라인";
type Row = { id: string; title: string; rep: Rep; roles: Role[]; genres: string[]; date: string; pub: boolean };

// 시안의 예시 값(글자·값은 시안용 예시). 역할 이름은 사이트의 역할 목록(lib/collab.ts)을 쓴다.
const SAMPLE_ROWS: Row[] = [
  { id: "w1", title: "악의 꽃", rep: "티저 영상", roles: ["script"], genres: ["드라마", "스릴러"], date: "2026.11.07", pub: true },
  { id: "w2", title: "사다함의 꿈", rep: "컨셉 이미지", roles: ["producer"], genres: ["드라마", "로맨스"], date: "2026.11.05", pub: true },
  { id: "w3", title: "단 하나의 꿈", rep: "로그라인", roles: ["script"], genres: ["드라마"], date: "2026.11.02", pub: false },
];

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={`${label} 공개`} className="pf-sw" onClick={onChange}>
      <i aria-hidden="true" />
      <span>{on ? "공개" : "비공개"}</span>
    </button>
  );
}

export function PortfolioManage() {
  const [rows, setRows] = useState<Row[]>(SAMPLE_ROWS);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [del, setDel] = useState<Row | null>(null);

  // 삭제 확인 창은 Esc로 닫는다.
  useEffect(() => {
    if (!del) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDel(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [del]);

  return (
    <div className="pf">
      <div className="pf-count">
        <span>〈작품 4 / 12〉</span>
        <span>〈파일 12MB / 20MB〉</span>
      </div>

      <div className="pf-head" aria-hidden="true">
        <span />
        <span>제목</span>
        <span>대표</span>
        <span>역할</span>
        <span>장르</span>
        <span>수정일</span>
        <span className="pf-head-end">관리</span>
      </div>

      {/* 맨 윗줄이 접힌 등록 화면이다. 누르면 이 줄 아래로 등록 화면이 펼쳐진다. */}
      <button type="button" className="pf-new" aria-expanded={newOpen} onClick={() => setNewOpen((v) => !v)}>
        <span className="pf-new-main">
          <span className="pf-plus" aria-hidden="true">＋</span> 새 포트폴리오 등록
        </span>
        <span className="pf-new-fold">
          <span className="pf-long">등록 화면 {newOpen ? "접기 ▴" : "펼치기 ▾"}</span>
          <span className="pf-short">{newOpen ? "접기 ▴" : "펼치기 ▾"}</span>
        </span>
      </button>
      {newOpen && <WorkEditor isPublic={false} roles={[]} onFold={() => setNewOpen(false)} />}

      {rows.map((r) => (
        <div key={r.id} className="pf-item">
          <div className={`pf-row${r.pub ? "" : " off"}`}>
            <span className="pf-grip" aria-hidden="true">⠿</span>
            <span className="pf-title">{r.title}</span>
            <span className="pf-meta">
              <span className="pf-rep">{r.rep}</span>
              <span className="pf-roles">{r.roles.map((x) => ROLES[x]).join(" · ")}</span>
              <span className="pf-genres">
                {r.genres.map((g) => (
                  <span key={g}>{g}</span>
                ))}
              </span>
            </span>
            <span className="pf-date">{r.date}</span>
            <span className="pf-sw-wrap">
              <Switch on={r.pub} label={r.title} onChange={() => setRows((cur) => cur.map((x) => (x.id === r.id ? { ...x, pub: !x.pub } : x)))} />
            </span>
            <span className="pf-actions">
              <button type="button" className="btn btn-ghost" aria-expanded={editing === r.id} onClick={() => setEditing(editing === r.id ? null : r.id)}>
                수정
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setDel(r)}>
                삭제
              </button>
            </span>
          </div>
          {editing === r.id && <WorkEditor isPublic={r.pub} roles={r.roles} onFold={() => setEditing(null)} />}
        </div>
      ))}

      {del && (
        <div className="pf-back" onMouseDown={(e) => e.target === e.currentTarget && setDel(null)}>
          <div className="pf-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pf-del-h" aria-describedby="pf-del-p">
            <h3 id="pf-del-h">「{del.title}」을 삭제할까요?</h3>
            <p id="pf-del-p">삭제하면 되돌릴 수 없습니다.</p>
            <div className="pf-dialog-btns">
              <button type="button" className="btn btn-ghost pf-cancel" autoFocus onClick={() => setDel(null)}>
                취소
              </button>
              <button type="button" className="btn pf-danger" onClick={() => { setRows((cur) => cur.filter((x) => x.id !== del.id)); setDel(null); }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
