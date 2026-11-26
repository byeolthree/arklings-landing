import Link from "next/link";
import "../creators/creators.css";
import "./projects.css";
import { ProjectCard } from "./project-card";
import { sampleToProject } from "./sample-data";
import type { SampleProject } from "./types";

// 작품 화면(예시): 작품 이름·소개·로그라인과, 그 작품에 연결된 공고 목록. 공고를 누르면 상세로 돌아간다.
export function WorkView({ work, projects, today, fromId }: { work: SampleProject["work"]; projects: SampleProject[]; today: string; fromId?: string }) {
  return (
    <div className="cr pj">
      <section className="cr-list">
        <div className="wrap pj-formwrap pj-workwrap">
          <Link href={fromId ? `/projects/${fromId}` : "/projects"} className="cr-back">
            {fromId ? "← 공고로 돌아가기" : "← 프로젝트 목록"}
          </Link>
          <p className="pj-eyebrow">작품</p>
          <h1 className="pj-form-title serif">「{work.title}」</h1>
          <p className="pj-body sm">{work.blurb}</p>
          <div className="pj-logline">
            <p className="pj-logline-head">
              <b className="pj-serif">{work.title}</b>
              <span aria-hidden="true">·</span>
              <b className="pj-kind">로그라인</b>
            </p>
            <p>{work.logline}</p>
          </div>
          <p className="pj-note" role="note">
            예시 화면이에요. 작품 포트폴리오 화면이 정해지면 이 자리를 바꿔 이어 붙입니다.
          </p>
          <h2 className="pj-rec-title">이 작품의 프로젝트 {projects.length}건</h2>
          <ul className="cr-grid">
            {projects.map((p) => (
              <li key={p.id}>
                <ProjectCard p={sampleToProject(p)} today={today} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
