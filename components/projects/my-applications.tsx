import Link from "next/link";
import { CONTRACT_STATUS_LABEL } from "@/lib/contracts";
import { APPLICATION_LABEL, type MyApplication } from "@/lib/projects";
import { formatKst } from "@/lib/time";
import "../creators/creators.css";
import "./projects.css";

// 내 지원 현황(/mypage/applications). 읽기만 한다. 목록은 로그인한 본인의 권한(RLS)으로 읽은 내 지원뿐이다.
export function MyApplications({ rows }: { rows: MyApplication[] | null }) {
  return (
    <div className="cr pj">
      <section className="cr-top">
        <div className="wrap">
          <h1 className="cr-title">내 지원 현황</h1>
          <p className="cr-desc">지원한 프로젝트의 진행 상태를 확인하세요.</p>
        </div>
      </section>
      <section className="cr-list">
        <div className="wrap pj-formwrap pj-listwrap">
          {rows === null ? (
            <div className="panel cr-state" role="alert">
              <h2>지원 현황을 불러오지 못했어요</h2>
              <p>잠시 뒤에 다시 열어 주세요.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="panel cr-state">
              <h2>아직 지원한 공고가 없어요</h2>
              <p>모집 중인 프로젝트를 둘러보고 지원해 보세요.</p>
              <Link href="/projects" className="btn btn-primary">
                프로젝트 보러 가기 <span className="arrow">→</span>
              </Link>
            </div>
          ) : (
            <ul className="pj-rows">
              {rows.map((r) => (
                <li key={r.id} className="panel pj-row">
                  <div className="pj-row-main">
                    {r.projectTitle ? (
                      <Link href={`/projects/${r.projectId}`} className="pj-row-title">
                        {r.projectTitle}
                      </Link>
                    ) : (
                      <span className="pj-row-title">내려간 공고예요</span>
                    )}
                    <span className="pj-row-sub">
                      지원 {formatKst(r.createdAt)}
                      {r.decidedAt ? ` · 처리 ${formatKst(r.decidedAt)}` : ""}
                    </span>
                  </div>
                  <span className="ct-badges">
                    {r.contract && (
                      <Link href={`/contracts/${r.contract.id}`} className="btn btn-ghost ct-link">
                        계약 보기 · {CONTRACT_STATUS_LABEL[r.contract.status]}
                      </Link>
                    )}
                    <span className={`pj-astatus ${r.status}`}>{APPLICATION_LABEL[r.status]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
