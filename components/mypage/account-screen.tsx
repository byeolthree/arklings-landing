import Link from "next/link";

// 마이페이지(옛 4구역 화면을 대체). 크리에이터·포트폴리오는 새 화면(/portfolio/new, 시안 01)이 맡고,
// 여기에는 새 시안이 아직 없는 「기본 정보」와 「협업 신청」만 둔다. 저장·로그인은 모두 부르는 쪽(app/mypage/page.tsx)의 진짜 처리다.
function Block({ id, tone, title, children }: { id: string; tone: "s1" | "s4"; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`mp-sec ${tone}`} aria-labelledby={`${id}-h`}>
      <div className="wrap">
        <div className="mp-sh">
          <h2 id={`${id}-h`}>{title}</h2>
        </div>
        <div className="mp-card">{children}</div>
      </div>
    </section>
  );
}

export function AccountScreen({ basic, collab }: { basic: React.ReactNode; collab: React.ReactNode }) {
  return (
    <div className="mp">
      <div className="mp-top">
        <div className="wrap">
          <h1 className="mp-title">마이 페이지</h1>
        </div>
      </div>
      <nav className="mp-nav" aria-label="이동">
        <div className="wrap">
          <div className="mp-tabs">
            <a className="mp-tab" href="#mp-basic" aria-current="true">기본 정보</a>
            <Link className="mp-tab" href="/portfolio/new?step=profile">크리에이터</Link>
            <Link className="mp-tab" href="/portfolio/new">포트폴리오</Link>
            <a className="mp-tab" href="#mp-collab">협업 신청</a>
          </div>
        </div>
      </nav>
      <div className="mp-body">
        <Block id="mp-basic" tone="s1" title="기본 정보">
          {basic}
        </Block>
        <Block id="mp-collab" tone="s4" title="협업 신청">
          {collab}
        </Block>
      </div>
    </div>
  );
}
