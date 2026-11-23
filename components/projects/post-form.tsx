import Link from "next/link";
import { ROLES } from "@/lib/collab";
import "../creators/creators.css";
import "./projects.css";

// 공고 올리기 화면(예시, 운영자만). GET 폼이라 「공고 올리기」를 누르면 목록(?posted=1&title=)으로 돌아가고, 아무것도 저장하지 않는다.
export function PostForm() {
  return (
    <div className="cr pj">
      <section className="cr-list">
        <div className="wrap pj-formwrap">
          <Link href="/projects" className="cr-back">
            ← 프로젝트 목록
          </Link>
          <h1 className="pj-form-title">공고 올리기</h1>
          <p className="pj-note" role="note">
            예시 화면이에요. 올려도 저장되지 않고, 눌렀을 때 어떻게 바뀌는지만 보여요.
          </p>
          <form className="panel pj-form" method="get" action="/projects">
            <input type="hidden" name="posted" value="1" />
            <div className="pj-field">
              <label htmlFor="pj-title">공고 제목</label>
              <input id="pj-title" name="title" type="text" required minLength={2} maxLength={60} placeholder="예) 「사다함의 꿈」 2화 콘티" />
            </div>
            <div className="pj-field">
              <label htmlFor="pj-summary">한 줄 요약</label>
              <textarea id="pj-summary" name="summary" rows={3} required minLength={10} maxLength={120} placeholder="어떤 일을 맡기는지 적어 주세요. (10~120자)" />
            </div>
            <div className="pj-field">
              <label htmlFor="pj-role">찾는 역할</label>
              <select id="pj-role" name="postRole" defaultValue="video">
                {(Object.keys(ROLES) as (keyof typeof ROLES)[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLES[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="pj-field-row">
              <div className="pj-field">
                <label htmlFor="pj-rmin">보상 최소 (만 원)</label>
                <input id="pj-rmin" name="rewardMin" type="number" min={0} max={10000} required defaultValue={100} />
              </div>
              <div className="pj-field">
                <label htmlFor="pj-rmax">보상 최대 (만 원)</label>
                <input id="pj-rmax" name="rewardMax" type="number" min={0} max={10000} required defaultValue={200} />
              </div>
            </div>
            <div className="pj-field">
              <label htmlFor="pj-deadline">모집 마감일</label>
              <input id="pj-deadline" name="deadline" type="date" required />
            </div>
            <div className="pj-form-act">
              <Link href="/projects" className="btn btn-ghost">
                취소
              </Link>
              <button type="submit" className="btn btn-primary">
                공고 올리기 <span aria-hidden="true">＋</span>
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
