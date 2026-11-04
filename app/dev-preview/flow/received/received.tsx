"use client";

import Link from "next/link";
import { useState } from "react";
import { ROLES, STATUSES, type Role, type Status } from "@/lib/collab";

type Row = { id: string; handle: string; applicant: string; role: Role; plan?: { title: string }; idea: string; contact: string; status: Status; date: string };

const ROWS: Row[] = [
  { id: "r1", handle: "seoha-park", applicant: "박서하", role: "video", plan: { title: "소금비 내리는 나라" }, idea: "이 로그라인으로 3분 쇼츠를 만들어 보고 싶어요.\n영상 쪽을 맡을 수 있어요.", contact: "example@email.com", status: "received", date: "방금" },
  { id: "r2", handle: "hayun-jung", applicant: "정하윤", role: "art_director", idea: "지난번 포트폴리오를 보고 연락드렸어요. 같이 작업해 보고 싶습니다.", contact: "010-0000-0000", status: "reviewing", date: "2026. 11. 2." },
  { id: "r3", handle: "dohyun-kim", applicant: "김도현", role: "producer", plan: { title: "달빛 아래 두 번째 문" }, idea: "피치 문서로 투자 자리를 만들어 보면 어떨까요.", contact: "example@email.com", status: "accepted", date: "2026. 10. 30." },
];

// 샘플 미리보기용: 상태 버튼을 눌러 상태가 바뀌는 모양만 보여 주고 아무것도 저장하지 않는다.
export function Received() {
  const [rows, setRows] = useState(ROWS);
  const set = (id: string, status: Status) => setRows((cur) => cur.map((r) => (r.id === id ? { ...r, status } : r)));
  return (
    <ul className="fl-rows">
      {rows.map((r) => (
        <li key={r.id} className="panel fl-row">
          <div className="fl-row-top">
            <h3>
              <Link href={`/dev-preview/flow/creators/${r.handle}`}>{r.applicant}</Link>
            </h3>
            <span className="fl-meta">{r.date}</span>
          </div>
          <p className="fl-meta">
            {ROLES[r.role]}
            {r.plan && ` · ${r.plan.title}`}
          </p>
          <p className="fl-idea">{r.idea}</p>
          <p className="fl-meta">연락처 {r.contact}</p>
          <p className="fl-meta" aria-live="polite">상태: <b>{STATUSES[r.status]}</b></p>
          <div className="fl-acts">
            {r.status === "received" && (
              <button type="button" className="btn btn-ghost" onClick={() => set(r.id, "reviewing")}>검토 시작</button>
            )}
            {(r.status === "received" || r.status === "reviewing") && (
              <>
                <button type="button" className="btn btn-primary" onClick={() => set(r.id, "accepted")}>수락</button>
                <button type="button" className="btn btn-ghost" onClick={() => set(r.id, "rejected")}>거절</button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
