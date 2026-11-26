"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteProject, type ManageState } from "@/app/actions/projects";
import { ConfirmPopup } from "@/components/ui/alert-popup";
import "../creators/creators.css";
import "./projects.css";
import { monthDay } from "./filter";
import { STATUS_LABEL, type Project } from "./types";

// 내 프로젝트(운영자): 내가 올린 공고 목록과 각 공고의 「지원자 관리」·「수정」·「삭제」 입구.
// 삭제는 확인 팝업 뒤에 deleteProject를 부른다(접수 지원이 남아 있으면 서버가 막고 안내를 돌려준다). 끝나면 목록이 새로 그려진다.
export function MyProjects({ projects }: { projects: Project[] | null }) {
  const [target, setTarget] = useState<Project | null>(null);
  const [result, setResult] = useState<ManageState | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    if (!target) return;
    const current = target;
    setTarget(null);
    setResult(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("project_id", current.id);
      setResult(await deleteProject({}, fd));
    });
  };

  return (
    <div className="cr pj">
      <section className="cr-list">
        <div className="wrap pj-formwrap pj-managewrap">
          <Link href="/projects" className="cr-back">
            ← 프로젝트 목록
          </Link>
          <h1 className="pj-form-title">내 프로젝트</h1>
          <div className="pj-manage-head">
            <span className="pj-form-sub">내가 올린 공고 {projects?.length ?? 0}건</span>
            <Link href="/projects/new" className="btn btn-primary pj-manage-close">
              공고 올리기 <span aria-hidden="true">＋</span>
            </Link>
          </div>

          {result?.message && (
            <p className={result.ok ? "pj-posted" : "pj-error"} role={result.ok ? "status" : "alert"}>
              {result.message}
            </p>
          )}
          {pending && (
            <p className="pj-note" role="status">
              처리하는 중이에요…
            </p>
          )}

          {projects === null ? (
            <div className="panel cr-state" role="alert">
              <h2>공고 목록을 불러오지 못했어요</h2>
              <p>잠시 뒤에 다시 열어 주세요.</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="panel cr-state">
              <h2>올린 공고가 없어요</h2>
              <p>「공고 올리기」로 첫 공고를 올려 보세요.</p>
            </div>
          ) : (
            <ul className="pj-applicants">
              {projects.map((p) => (
                <li key={p.id} className="panel pj-applicant">
                  <div className="pj-applicant-top">
                    <Link href={`/projects/${p.id}`} className="pj-applicant-name">
                      {p.title}
                    </Link>
                    <span className={`pj-badge ${p.status}`}>{STATUS_LABEL[p.status]}</span>
                    <span className="pj-applicant-time">
                      지원자 {p.applicants}명 · {monthDay(p.postedAt)} 올림 · {monthDay(p.deadline)} 마감
                    </span>
                  </div>
                  <div className="pj-applicant-act">
                    <Link href={`/projects/${p.id}/manage`} className="btn btn-ghost">
                      지원자 관리
                    </Link>
                    {p.status !== "closed" && (
                      <Link href={`/projects/${p.id}/edit`} className="btn btn-ghost">
                        수정
                      </Link>
                    )}
                    <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => setTarget(p)}>
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      {target && (
        <ConfirmPopup confirmLabel="삭제하기" cancelLabel="취소" onConfirm={run} onCancel={() => setTarget(null)} onClose={() => setTarget(null)}>
          「{target.title}」 공고를 삭제할까요? 삭제하면 목록과 상세, 북마크에서 사라져요.
        </ConfirmPopup>
      )}
    </div>
  );
}
