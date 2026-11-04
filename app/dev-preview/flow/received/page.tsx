import type { Metadata } from "next";
import Link from "next/link";
import "@/components/creators/creators.css";
import "@/components/flow/flow.css";
import { FlowHelper } from "@/components/flow/flow-helper";
import { Received } from "./received";

// 디자인 확인용 샘플 미리보기(협업 신청 흐름 5단계, 크리에이터가 보는 「받은 신청」).
export const metadata: Metadata = { title: "받은 신청 흐름 샘플", robots: { index: false, follow: false } };

export default function FlowReceivedPage() {
  return (
    <>
      <FlowHelper />
      <div className="cr">
        <section className="cr-top">
          <div className="wrap">
            <h1 className="cr-title">받은 신청</h1>
            <p className="cr-desc">나에게 온 협업 신청을 확인하고 상태를 바꿀 수 있어요.</p>
          </div>
        </section>
        <section className="cr-list">
          <div className="wrap">
            <Received />
            <div className="fl-links">
              <Link href="/dev-preview/flow/sent" className="btn btn-ghost">보낸 신청 보기</Link>
              <Link href="/dev-preview/flow/creators" className="btn btn-ghost">크리에이터 목록으로</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
