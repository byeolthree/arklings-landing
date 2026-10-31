"use client";

import "@/components/portfolio/portfolio.css";

export default function PortfolioError({ retry }: { error: Error; retry: () => void }) {
  return (
    <div className="pf">
      <div className="pf-state-wrap">
        <div className="wrap narrow">
          <div className="panel pf-state" role="alert">
            <h1 className="text-[18px] md:text-[20px]">포트폴리오를 불러오지 못했어요</h1>
            <p>잠시 후 다시 시도해 주세요.</p>
            <button type="button" onClick={() => retry()} className="btn btn-primary">
              다시 시도
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
