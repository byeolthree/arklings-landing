"use client";

import "./creators.css";

// 크리에이터 화면의 오류 화면(error.tsx에서 쓴다). 무슨 일인지 알려 주는 제목과 「다시 시도」 버튼을 둔다.
export function ErrorView({ title, retry }: { title: string; retry: () => void }) {
  return (
    <div className="cr">
      <section className="cr-list">
        <div className="wrap cr-state-wrap">
          <div className="panel cr-state" role="alert">
            <h1>{title}</h1>
            <p>잠시 후 다시 시도해 주세요.</p>
            <button type="button" onClick={() => retry()} className="btn btn-primary">
              다시 시도
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
