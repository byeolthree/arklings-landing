import Link from "next/link";
import "../creators/creators.css";
import "./projects.css";
import { ProjectCard } from "./project-card";
import type { Project } from "./types";

// 내 북마크(/mypage/bookmarks). 북마크한 공고 카드를 보여 준다. 카드의 북마크 버튼을 한 번 더 누르면 해제된다.
export function MyBookmarks({ projects, today }: { projects: Project[] | null; today: string }) {
  return (
    <div className="cr pj">
      <section className="cr-top">
        <div className="wrap">
          <h1 className="cr-title">내 북마크</h1>
          <p className="cr-desc">나중에 보려고 담아 둔 프로젝트예요.</p>
        </div>
      </section>
      <section className="cr-list">
        <div className="wrap">
          {projects === null ? (
            <div className="panel cr-state" role="alert">
              <h2>북마크를 불러오지 못했어요</h2>
              <p>잠시 뒤에 다시 열어 주세요.</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="panel cr-state">
              <h2>북마크한 공고가 없어요</h2>
              <p>마음에 드는 프로젝트의 북마크 버튼을 눌러 담아 두세요.</p>
              <Link href="/projects" className="btn btn-primary">
                프로젝트 보러 가기 <span className="arrow">→</span>
              </Link>
            </div>
          ) : (
            <ul className="cr-grid">
              {projects.map((p) => (
                <li key={p.id}>
                  <ProjectCard p={p} today={today} bookmarked loggedIn />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
