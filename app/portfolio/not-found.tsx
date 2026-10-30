import Link from "next/link";
import "@/components/portfolio/portfolio.css";

// 없는 주소, 공개를 끈 기획안, 지워진 기획안이 모두 이 화면으로 온다(어느 경우인지 구분해 알려 주지 않는다).
export default function PortfolioNotFound() {
  return (
    <div className="pf">
      <div className="pf-state-wrap">
        <div className="wrap narrow">
          <div className="panel pf-state">
            <h1 className="text-[18px] md:text-[20px]">찾을 수 없는 기획안이에요</h1>
            <p>주소가 잘못되었거나, 공개가 끝난 기획안일 수 있어요.</p>
            <Link href="/portfolio" className="btn btn-primary">
              포트폴리오 둘러보기 <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
