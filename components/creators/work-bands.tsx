"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { reorderWorks, setWorkPublic } from "@/app/actions/creators";
import { RoleTags } from "./role-tags";
import type { WorkCard } from "./types";
import { WorkMedia } from "./work-media";

// 프로필의 작품 섹션들(시안 03·08). 작품 하나가 한 섹션이고 배경이 번갈아 바뀐다.
// 주인이 자기 프로필을 볼 때(owner)만 제목 줄 오른쪽에 공개 스위치와 순서 손잡이가 붙는다. 스위치는 setWorkPublic, 손잡이는 reorderWorks로 진짜 저장한다.
export function WorkBands({ works, hrefs, owner }: { works: WorkCard[]; hrefs: string[]; owner: boolean }) {
  const router = useRouter();
  const [order, setOrder] = useState(() => works.map((w) => w.id));
  const [msg, setMsg] = useState<string | null>(null);
  const drag = useRef<string | null>(null);
  const byId = new Map(works.map((w, i) => [w.id, { w, href: hrefs[i] }]));

  async function applyOrder(next: string[]) {
    const prev = order;
    setOrder(next);
    setMsg(null);
    const r = await reorderWorks(next);
    if (!r.ok) {
      setOrder(prev);
      return setMsg(r.error);
    }
    router.refresh();
  }
  const moveTo = (id: string, to: number) => {
    const from = order.indexOf(id);
    if (from < 0 || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, id);
    void applyOrder(next);
  };

  return (
    <>
      {msg && (
        <p role="alert" className="cr-band-msg wrap">
          {msg}
        </p>
      )}
      {order.map((id, i) => {
        const it = byId.get(id);
        if (!it) return null;
        return (
          <div
            key={id}
            onDragOver={owner ? (e) => e.preventDefault() : undefined}
            onDrop={
              owner
                ? (e) => {
                    e.preventDefault();
                    if (drag.current) moveTo(drag.current, i);
                    drag.current = null;
                  }
                : undefined
            }
          >
            <Band work={it.w} href={it.href} owner={owner} tone={i % 2 === 0 ? "tint" : "plain"} onGrip={{ start: () => (drag.current = id), key: (dir) => moveTo(id, i + dir) }} />
          </div>
        );
      })}
    </>
  );
}

function Band({ work, href, owner, tone, onGrip }: { work: WorkCard; href: string; owner: boolean; tone: "tint" | "plain"; onGrip: { start: () => void; key: (dir: -1 | 1) => void } }) {
  const router = useRouter();
  const [pub, setPub] = useState(work.isPublic !== false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const off = owner && !pub;

  // 공개 스위치: 누르는 즉시 바뀌어 보이고, 저장 중에는 잠그며, 서버가 실패하면 원래대로 되돌리고 줄 아래에 오류를 보여 준다.
  async function toggle() {
    if (busy) return;
    const before = pub;
    const next = !before;
    setErr(null);
    setPub(next);
    setBusy(true);
    const r = await setWorkPublic(work.id, next);
    setBusy(false);
    if (!r.ok) {
      setPub(before);
      return setErr(r.error);
    }
    router.refresh();
  }

  const hasMedia = (work.media?.length ?? 0) > 0;
  return (
    <section className={`cr-band ${tone}${off ? " off" : ""}`} aria-labelledby={`cr-band-${work.id}`}>
      <div className="wrap">
        <div className={`cr-band-in${hasMedia ? "" : " nomedia"}`}>
          {hasMedia && <WorkMedia href={href} items={work.media} />}
          <div className="cr-band-body">
            <div className="cr-band-title">
              <h3 id={`cr-band-${work.id}`} className="cr-work-title">
                <Link href={href}>{work.title}</Link>
              </h3>
              {owner && (
                <div className="cr-ctl">
                  <button type="button" role="switch" aria-checked={pub} aria-label={`${work.title} 공개`} className="cr-sw" disabled={busy} onClick={toggle}>
                    <i aria-hidden="true" />
                    <span>{pub ? "공개" : "비공개"}</span>
                  </button>
                  <Link href={`/portfolio/new?work=${work.id}`} className="cr-edit" aria-label={`${work.title} 수정`}>
                    수정
                  </Link>
                  <button
                    type="button"
                    className="cr-grip"
                    draggable
                    aria-label={`${work.title} 순서 바꾸기(끌어서 옮기거나 위아래 화살표 키)`}
                    onDragStart={(e) => {
                      onGrip.start();
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", work.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                        e.preventDefault();
                        onGrip.key(e.key === "ArrowUp" ? -1 : 1);
                      }
                    }}
                  >
                    ⠿
                  </button>
                </div>
              )}
            </div>
            {err && (
              <p role="alert" className="cr-band-msg">
                {err}
              </p>
            )}
            <p className="cr-band-log">{work.logline}</p>
            <div className="cr-band-foot">
              {work.kind && <p className="cr-kind">{work.kind}</p>}
              <div className="cr-band-tags">
                <RoleTags roles={work.roles} />
                {work.genres.length > 0 && (
                  <ul className="cr-genres" aria-label="장르">
                    {work.genres.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
