import Link from "next/link";
import "@/components/creators/creators.css";

// 없는 공개 주소는 이 화면으로 온다(샘플 미리보기용. 실제 화면은 app/creators 쪽에 같은 모양으로 둔다).
export default function CreatorNotFound() {
  return (
    <div className="cr">
      <section className="cr-list">
        <div className="wrap">
          <div className="panel cr-state" style={{ marginTop: 48 }}>
            <h1 className="text-[18px] md:text-[20px]">찾을 수 없는 크리에이터예요</h1>
            <p>주소가 잘못되었거나, 공개한 기획안이 없는 크리에이터일 수 있어요.</p>
            <Link href="/dev-preview/creators" className="btn btn-primary">
              크리에이터 둘러보기 <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
