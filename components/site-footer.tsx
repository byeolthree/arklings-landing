import Link from "next/link";

// 랜딩(public/landing.html)의 하단과 같은 모양과 같은 글
export function SiteFooter() {
  return (
    <footer className="lk-footer">
      <div className="lk-wrap">
        <div>
          <b>Arklings</b>
          <p>한국 신화·고대사 기반 IP 스튜디오. 다양한 창작자가 함께 고유 세계관을 만들어갑니다.</p>
          <p>© 2026 Arklings. All rights reserved.</p>
        </div>
        <div className="links">
          <span>이용약관</span>
          <Link href="/privacy">개인정보처리방침</Link>
          <span>hello@arklings.kr</span>
        </div>
      </div>
    </footer>
  );
}
