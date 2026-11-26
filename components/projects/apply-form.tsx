"use client";

import Link from "next/link";
import { useActionState } from "react";
import { applyToProject, type ApplyState } from "@/app/actions/projects";
import "../creators/creators.css";
import "./projects.css";

// 지원서 화면. 「지원서 보내기」는 applyToProject(DB 함수 apply_to_project)를 부르고, 성공하면 내 지원 현황으로 이동한다.
export function ApplyForm({ projectId, title, reward, works }: { projectId: string; title: string; reward: string; works: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyToProject, {});
  const v = state.values;
  return (
    <div className="cr pj">
      <section className="cr-list">
        <div className="wrap pj-formwrap">
          <Link href={`/projects/${projectId}`} className="cr-back">
            ← 공고로 돌아가기
          </Link>
          <h1 className="pj-form-title">지원서 쓰기</h1>
          <p className="pj-form-sub">
            <b>{title}</b> · {reward}
          </p>
          <form className="panel pj-form" action={action} noValidate>
            <input type="hidden" name="project_id" value={projectId} />
            {state.message && (
              <p className="pj-error" role="alert">
                {state.message}
              </p>
            )}
            <div className="pj-field">
              <label htmlFor="pj-portfolio">함께 보낼 포트폴리오(내 작품)</label>
              <select id="pj-portfolio" name="portfolio" defaultValue={v?.portfolio ?? works[0]?.id} aria-invalid={Boolean(state.errors?.portfolio)} aria-describedby={state.errors?.portfolio ? "pj-portfolio-error" : undefined}>
                {works.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
              {state.errors?.portfolio && (
                <p id="pj-portfolio-error" className="pj-field-error" role="alert">
                  {state.errors.portfolio}
                </p>
              )}
            </div>
            <div className="pj-field">
              <label htmlFor="pj-motive">지원 동기</label>
              <textarea id="pj-motive" name="motive" rows={6} maxLength={500} defaultValue={v?.motive ?? ""} placeholder="이 프로젝트에 지원하는 이유와 할 수 있는 일을 적어 주세요. (10~500자)" aria-invalid={Boolean(state.errors?.motive)} aria-describedby={state.errors?.motive ? "pj-motive-error" : undefined} />
              {state.errors?.motive && (
                <p id="pj-motive-error" className="pj-field-error" role="alert">
                  {state.errors.motive}
                </p>
              )}
            </div>
            <div className="pj-field-row">
              <div className="pj-field">
                <label htmlFor="pj-offer">제안 보상 (만 원, 선택)</label>
                <input id="pj-offer" name="offer" type="text" inputMode="numeric" defaultValue={v?.offer ?? ""} placeholder="예) 300" aria-invalid={Boolean(state.errors?.offer)} aria-describedby={state.errors?.offer ? "pj-offer-error" : undefined} />
                {state.errors?.offer && (
                  <p id="pj-offer-error" className="pj-field-error" role="alert">
                    {state.errors.offer}
                  </p>
                )}
              </div>
              <div className="pj-field">
                <label htmlFor="pj-period">가능한 기간 (선택)</label>
                <input id="pj-period" name="period" type="text" maxLength={60} defaultValue={v?.period ?? ""} placeholder="예) 12월 15일부터 5주" aria-invalid={Boolean(state.errors?.period)} aria-describedby={state.errors?.period ? "pj-period-error" : undefined} />
                {state.errors?.period && (
                  <p id="pj-period-error" className="pj-field-error" role="alert">
                    {state.errors.period}
                  </p>
                )}
              </div>
            </div>
            <div className="pj-form-act">
              <Link href={`/projects/${projectId}`} className="btn btn-ghost">
                취소
              </Link>
              <button type="submit" className="btn btn-primary" disabled={pending} aria-busy={pending}>
                {pending ? "보내는 중…" : "지원서 보내기"} {!pending && <span className="arrow">→</span>}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
