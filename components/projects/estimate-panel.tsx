"use client";

import { useRef, useState, useTransition } from "react";
import { estimateProject } from "@/app/actions/ai-estimate";
import type { EstimateItem } from "@/lib/ai/estimate-schema";
import { STRENGTH_LABEL } from "@/lib/ai/estimate-schema";

type View =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "result"; items: EstimateItem[]; total: number };

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const REWARD_MAX_MAN = 100000; // 공고 보상 상한(만 원). 올리기·수정 검사와 같다.

// 공고 올리기·수정 화면 안의 「AI 단가 분석」 칸. 폼의 제목·요약·소개·역할을 읽어 estimateProject(서버)에 보내고, 결과 표와 총액을 보인다.
// 「예산 반영」은 폼의 보상 최소·최대 칸에 총액(만 원, 올림)을 채울 뿐 저장하지 않는다. 저장은 폼의 기존 버튼이 한다.
export function EstimatePanel({ locked }: { locked: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ kind: "idle" });
  const [applied, setApplied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    const form = root.current?.closest("form");
    if (!form) return;
    const fd = new FormData(form);
    const input = {
      title: String(fd.get("title") ?? ""),
      summary: String(fd.get("summary") ?? ""),
      description: String(fd.get("description") ?? ""),
      roles: fd.getAll("roles").map(String),
    };
    setApplied(null);
    setView({ kind: "idle" });
    startTransition(async () => {
      const res = await estimateProject(input);
      setView(res.ok ? { kind: "result", items: res.items, total: res.total } : { kind: "error", message: res.error });
    });
  };

  const man = view.kind === "result" ? Math.ceil(view.total / 10000) : 0;
  const blocked = view.kind !== "result" ? null : locked ? "지원자가 있는 공고는 보상을 바꿀 수 없어요." : view.total <= 0 ? "단가 기준이 있는 작업이 없어 반영할 금액이 없어요." : man > REWARD_MAX_MAN ? "총액이 보상 상한(10억 원)을 넘어 반영할 수 없어요." : null;

  const apply = () => {
    const form = root.current?.closest("form");
    if (!form || view.kind !== "result" || blocked) return;
    for (const name of ["reward_min", "reward_max"]) {
      const el = form.elements.namedItem(name);
      if (el instanceof HTMLInputElement) el.value = String(man);
    }
    setApplied(`보상 최소·최대 칸에 ${man.toLocaleString("ko-KR")}만 원을 넣었어요. 저장하려면 아래 버튼을 눌러 주세요.`);
  };

  return (
    <div className="pj-est" ref={root}>
      <div className="pj-est-head">
        <div>
          <b>AI 단가 분석</b>
          <p>제목·요약·소개·역할을 기준 단가표에 맞춰 기능별 참고 견적을 내 드려요.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={run} disabled={pending} aria-busy={pending}>
          {pending ? "분석하는 중…" : view.kind === "idle" ? "AI 단가 분석" : "다시 분석"}
        </button>
      </div>

      {view.kind === "error" && (
        <p className="pj-error" role="alert">
          {view.message}
        </p>
      )}

      {view.kind === "result" && (
        <div className="pj-est-result" role="status">
          <div className="pj-est-scroll">
            <table className="pj-est-table">
              <caption className="pj-sr">AI 단가 분석 결과</caption>
              <thead>
                <tr>
                  <th scope="col">기능</th>
                  <th scope="col">설명</th>
                  <th scope="col" className="num">
                    예상 단가
                  </th>
                  <th scope="col">산정 근거</th>
                  <th scope="col">근거 강도</th>
                </tr>
              </thead>
              <tbody>
                {view.items.map((it, i) => (
                  <tr key={i}>
                    <th scope="row">{it.name}</th>
                    <td>{it.description}</td>
                    <td className="num">{it.strength === "none" ? "—" : won(it.unitPrice)}</td>
                    <td>{it.basis}</td>
                    <td>
                      {STRENGTH_LABEL[it.strength]}
                      {it.strength === "weak" && <span className="pj-est-flag">대체 근거</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={2}>
                    총액
                  </th>
                  <td className="num">
                    <b>{won(view.total)}</b>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="pj-est-note">이 금액은 계약 금액이 아니라 참고 견적이에요. 기준 단가표(초안)에 있는 값만 근거로 썼어요.</p>
          <div className="pj-est-act">
            <button type="button" className="btn btn-primary" onClick={apply} disabled={Boolean(blocked)}>
              예산 반영
            </button>
            {blocked && <span className="pj-field-error">{blocked}</span>}
          </div>
          {applied && (
            <p className="pj-posted" role="status">
              {applied}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
