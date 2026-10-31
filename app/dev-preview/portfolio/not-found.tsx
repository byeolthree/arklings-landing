import Link from "next/link";
import "@/components/creators/creators.css";

// 없는 번호·UUID가 아닌 값·공개를 끈 기획안은 모두 이 화면으로 온다(샘플 미리보기용. 실제 화면은 app/portfolio/not-found.tsx).
export default function PlanNotFound() {
  return (
    <div className="cr">
      <section className="cr-list">
        <div className="wrap">
          <div className="panel cr-state" style={{ marginTop: 48 }}>
            <h1 className="text-[18px] md:text-[20px]">찾을 수 없는 기획안이에요</h1>
            <p>주소가 잘못되었거나, 공개가 끝난 기획안일 수 있어요.</p>
            <Link href="/dev-preview/creators" className="btn btn-primary">
              크리에이터 둘러보기 <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
