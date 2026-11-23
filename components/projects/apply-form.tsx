import Link from "next/link";
import "../creators/creators.css";
import "./projects.css";
import { SAMPLE_PORTFOLIOS } from "./sample-data";
import { rewardText } from "./filter";
import type { Project } from "./types";

// 지원서 화면(예시). 칸은 GET 폼이라 「지원서 보내기」를 누르면 상세(?applied=1)로 돌아가고, 아무것도 저장하지 않는다.
export function ApplyForm({ p }: { p: Project }) {
  return (
    <div className="cr pj">
      <section className="cr-list">
        <div className="wrap pj-formwrap">
          <Link href={`/projects/${p.id}`} className="cr-back">
            ← 공고로 돌아가기
          </Link>
          <h1 className="pj-form-title">지원서 쓰기</h1>
          <p className="pj-form-sub">
            「{p.title}」 · {rewardText(p)}
          </p>
          <p className="pj-note" role="note">
            예시 화면이에요. 보내도 저장되지 않고, 눌렀을 때 어떻게 바뀌는지만 보여요.
          </p>
          <form className="panel pj-form" method="get" action={`/projects/${p.id}`}>
            <input type="hidden" name="applied" value="1" />
            <div className="pj-field">
              <label htmlFor="pj-portfolio">함께 보낼 포트폴리오</label>
              <select id="pj-portfolio" name="portfolio" defaultValue={SAMPLE_PORTFOLIOS[0]} required>
                {SAMPLE_PORTFOLIOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="pj-field">
              <label htmlFor="pj-motive">지원 동기</label>
              <textarea id="pj-motive" name="motive" rows={6} required minLength={10} maxLength={500} placeholder="이 프로젝트에 지원하는 이유와 할 수 있는 일을 적어 주세요. (10~500자)" />
            </div>
            <div className="pj-form-act">
              <Link href={`/projects/${p.id}`} className="btn btn-ghost">
                취소
              </Link>
              <button type="submit" className="btn btn-primary">
                지원서 보내기 <span className="arrow">→</span>
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
