"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createProject, type PostState } from "@/app/actions/projects";
import { GENRES } from "../creators/genres";
import { ROLES } from "@/lib/collab";
import "../creators/creators.css";
import "./projects.css";

const asList = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const asText = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

// 공고 올리기 화면(운영자만). 「공고 올리기」는 createProject를 불러 projects 표에 저장하고, 성공하면 새 공고 상세로 이동한다.
export function PostForm({ sourceWorks }: { sourceWorks: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<PostState, FormData>(createProject, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const roles = asList(v.roles);
  const genres = asList(v.genres);
  const err = (key: string) =>
    e[key] ? (
      <p id={`pj-${key}-error`} className="pj-field-error" role="alert">
        {e[key]}
      </p>
    ) : null;
  return (
    <div className="cr pj">
      <section className="cr-list">
        <div className="wrap pj-formwrap">
          <Link href="/projects" className="cr-back">
            ← 프로젝트 목록
          </Link>
          <h1 className="pj-form-title">공고 올리기</h1>
          <form className="panel pj-form" action={action} noValidate>
            {state.message && (
              <p className="pj-error" role="alert">
                {state.message}
              </p>
            )}
            <div className="pj-field">
              <label htmlFor="pj-title">공고 제목</label>
              <input id="pj-title" name="title" type="text" maxLength={60} defaultValue={asText(v.title)} placeholder="예) 「사다함의 꿈」 2화 콘티" aria-invalid={Boolean(e.title)} aria-describedby={e.title ? "pj-title-error" : undefined} />
              {err("title")}
            </div>
            <div className="pj-field">
              <label htmlFor="pj-summary">한 줄 요약</label>
              <textarea id="pj-summary" name="summary" rows={2} maxLength={120} defaultValue={asText(v.summary)} placeholder="어떤 일을 맡기는지 적어 주세요. (10~120자)" aria-invalid={Boolean(e.summary)} aria-describedby={e.summary ? "pj-summary-error" : undefined} />
              {err("summary")}
            </div>
            <div className="pj-field">
              <label htmlFor="pj-description">소개 글 (선택)</label>
              <textarea id="pj-description" name="description" rows={6} maxLength={3000} defaultValue={asText(v.description)} placeholder="하는 일, 받는 자료, 기대하는 결과물을 적어 주세요. (3000자까지)" aria-invalid={Boolean(e.description)} aria-describedby={e.description ? "pj-description-error" : undefined} />
              {err("description")}
            </div>
            <fieldset className="pj-field pj-checks">
              <legend>찾는 역할</legend>
              <div className="pj-check-list">
                {(Object.keys(ROLES) as (keyof typeof ROLES)[]).map((r) => (
                  <label key={r} className="pj-check">
                    <input type="checkbox" name="roles" value={r} defaultChecked={roles.includes(r)} /> {ROLES[r]}
                  </label>
                ))}
              </div>
              {err("roles")}
            </fieldset>
            <fieldset className="pj-field pj-checks">
              <legend>장르 (선택)</legend>
              <div className="pj-check-list">
                {GENRES.map((g) => (
                  <label key={g} className="pj-check">
                    <input type="checkbox" name="genres" value={g} defaultChecked={genres.includes(g)} /> {g}
                  </label>
                ))}
              </div>
              {err("genres")}
            </fieldset>
            <div className="pj-field-row">
              <div className="pj-field">
                <label htmlFor="pj-reward-min">보상 최소 (만 원)</label>
                <input id="pj-reward-min" name="reward_min" type="text" inputMode="numeric" defaultValue={asText(v.reward_min)} placeholder="협의면 비워 두세요" aria-invalid={Boolean(e.reward)} aria-describedby={e.reward ? "pj-reward-error" : undefined} />
              </div>
              <div className="pj-field">
                <label htmlFor="pj-reward-max">보상 최대 (만 원)</label>
                <input id="pj-reward-max" name="reward_max" type="text" inputMode="numeric" defaultValue={asText(v.reward_max)} placeholder="협의면 비워 두세요" aria-invalid={Boolean(e.reward)} aria-describedby={e.reward ? "pj-reward-error" : undefined} />
              </div>
            </div>
            {err("reward")}
            <div className="pj-field-row">
              <div className="pj-field">
                <label htmlFor="pj-opens">모집 시작일</label>
                <input id="pj-opens" name="opens_on" type="date" defaultValue={asText(v.opens_on)} aria-invalid={Boolean(e.opens_on)} aria-describedby={e.opens_on ? "pj-opens_on-error" : undefined} />
                {err("opens_on")}
              </div>
              <div className="pj-field">
                <label htmlFor="pj-deadline">모집 마감일</label>
                <input id="pj-deadline" name="deadline_on" type="date" defaultValue={asText(v.deadline_on)} aria-invalid={Boolean(e.deadline_on)} aria-describedby={e.deadline_on ? "pj-deadline_on-error" : undefined} />
                {err("deadline_on")}
              </div>
            </div>
            <div className="pj-field-row">
              <div className="pj-field">
                <label htmlFor="pj-work-start">작업 시작일 (선택)</label>
                <input id="pj-work-start" name="work_starts_on" type="date" defaultValue={asText(v.work_starts_on)} aria-invalid={Boolean(e.work)} aria-describedby={e.work ? "pj-work-error" : undefined} />
              </div>
              <div className="pj-field">
                <label htmlFor="pj-work-end">작업 종료일 (선택)</label>
                <input id="pj-work-end" name="work_ends_on" type="date" defaultValue={asText(v.work_ends_on)} aria-invalid={Boolean(e.work)} aria-describedby={e.work ? "pj-work-error" : undefined} />
              </div>
            </div>
            {err("work")}
            <div className="pj-field-row">
              <div className="pj-field">
                <label htmlFor="pj-source">출처</label>
                <select id="pj-source" name="source" defaultValue={asText(v.source) || "arklings"} aria-invalid={Boolean(e.source)} aria-describedby={e.source ? "pj-source-error" : undefined}>
                  <option value="arklings">아클링스 추진</option>
                  <option value="request">협업 의뢰</option>
                </select>
                {err("source")}
              </div>
              <div className="pj-field">
                <label htmlFor="pj-source-work">연결 작품 (선택)</label>
                <select id="pj-source-work" name="source_work_id" defaultValue={asText(v.source_work_id)} aria-invalid={Boolean(e.source_work_id)} aria-describedby={e.source_work_id ? "pj-source_work_id-error" : undefined}>
                  <option value="">연결하지 않음</option>
                  {sourceWorks.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
                </select>
                {err("source_work_id")}
              </div>
            </div>
            <div className="pj-form-act">
              <Link href="/projects" className="btn btn-ghost">
                취소
              </Link>
              <button type="submit" className="btn btn-primary" disabled={pending} aria-busy={pending}>
                {pending ? "올리는 중…" : "공고 올리기"} {!pending && <span aria-hidden="true">＋</span>}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
