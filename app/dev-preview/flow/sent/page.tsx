import type { Metadata } from "next";
import Link from "next/link";
import "@/components/creators/creators.css";
import "@/components/flow/flow.css";
import { FlowHelper } from "@/components/flow/flow-helper";
import { creatorOf, itemOf } from "@/components/flow/sample";
import { ROLES, STATUSES, type Role, type Status } from "@/lib/collab";

// 디자인 확인용 샘플 미리보기(협업 신청 흐름 5단계, 신청자가 보는 「보낸 신청」). 접수 → 검토 중 → 수락/거절.
export const metadata: Metadata = { title: "보낸 신청 흐름 샘플", robots: { index: false, follow: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

type Row = { id: string; creator: string; plan?: string; role: Role; status: Status; date: string };
const SAMPLE: Row[] = [
  { id: "s1", creator: "seoha-park", plan: "seoha-park-1", role: "video", status: "reviewing", date: "2026. 11. 2." },
  { id: "s2", creator: "hayun-jung", plan: "hayun-jung-2", role: "script", status: "accepted", date: "2026. 10. 28." },
  { id: "s3", creator: "dohyun-kim", role: "video", status: "rejected", date: "2026. 10. 20." },
];

function Steps({ status }: { status: Status }) {
  const last = status === "accepted" ? "수락" : status === "rejected" ? "거절" : "수락 / 거절";
  const idx = status === "received" ? 0 : status === "reviewing" ? 1 : 2;
  const labels = [STATUSES.received, STATUSES.reviewing, last];
  return (
    <ol className="fl-steps" aria-label="처리 상태">
      {labels.map((l, i) => (
        <li key={l} className={i === idx ? "on" : i < idx ? "done" : ""} aria-current={i === idx ? "step" : undefined}>
          {l}
        </li>
      ))}
    </ol>
  );
}

export default async function FlowSentPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const nc = creatorOf(one(sp.new));
  const nr = one(sp.role);
  const fresh: Row | null = nc
    ? { id: "new", creator: nc.handle, plan: itemOf(nc, one(sp.plan))?.id, role: (nr && nr in ROLES ? nr : nc.roles[0]) as Role, status: "received", date: "방금" }
    : null;
  const rows = fresh ? [fresh, ...SAMPLE] : SAMPLE;

  return (
    <>
      <FlowHelper />
      <div className="cr">
        <section className="cr-top">
          <div className="wrap">
            <h1 className="cr-title">보낸 신청</h1>
            <p className="cr-desc">내가 보낸 협업 신청이 지금 어디까지 왔는지 볼 수 있어요.</p>
          </div>
        </section>
        <section className="cr-list">
          <div className="wrap">
            {fresh && <p className="cr-count" role="status">신청을 보냈어요. 받은 사람이 확인하면 상태가 바뀌어요.</p>}
            <ul className="fl-rows">
              {rows.map((r) => {
                const c = creatorOf(r.creator)!;
                const it = r.plan ? itemOf(c, r.plan) : undefined;
                return (
                  <li key={r.id} className="panel fl-row">
                    <div className="fl-row-top">
                      <h3>
                        <Link href={`/dev-preview/flow/creators/${c.handle}`}>{c.name}</Link>
                      </h3>
                      <span className="fl-meta">{r.date}</span>
                    </div>
                    <p className="fl-meta">
                      {ROLES[r.role]}
                      {it && ` · ${it.title}`}
                    </p>
                    <Steps status={r.status} />
                  </li>
                );
              })}
            </ul>
            <div className="fl-links">
              <Link href="/dev-preview/flow/received" className="btn btn-ghost">받은 신청 보기</Link>
              <Link href="/dev-preview/flow/creators" className="btn btn-ghost">크리에이터 목록으로</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
