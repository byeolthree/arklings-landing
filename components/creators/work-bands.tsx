"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLiveReorder } from "@/components/ui/use-live-reorder";
import { reorderWorks, setWorkPublic } from "@/app/actions/creators";
import type { Role } from "@/lib/collab";
import { FormatTags } from "./format-tags";
import { RoleTags } from "./role-tags";
import type { WorkCard } from "./types";
import { WorkMedia } from "./work-media";

// 프로필의 작품 섹션들(시안 03·08). 작품 하나가 한 섹션이고 배경이 번갈아 바뀐다.
// 주인이 자기 프로필을 볼 때(owner)만 제목 줄 오른쪽에 공개 스위치와 순서 손잡이가 붙는다. 스위치는 setWorkPublic, 손잡이는 reorderWorks로 진짜 저장한다.
// 역할은 프로필 한 곳에서 가져온다(작품마다 복사된 역할은 쓰지 않는다, 2026-11-13).
export function WorkBands({ works, hrefs, owner, roles }: { works: WorkCard[]; hrefs: string[]; owner: boolean; roles: Role[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const byId = new Map(works.map((w, i) => [w.id, { w, href: hrefs[i] }]));
  // 손잡이 순서(공통 동작: components/ui/use-live-reorder.ts). 주인만 쓴다.
  const reorder = useLiveReorder(
    works.map((w) => w.id),
    async (next) => {
      setMsg(null);
      const r = await reorderWorks(next);
      if (!r.ok) {
        setMsg(r.error);
        return false;
      }
      router.refresh();
      return true;
    },
  );

  return (
    <>
      {msg && (
        <p role="alert" className="cr-band-msg wrap">
          {msg}
        </p>
      )}
      <div {...(owner ? reorder.listProps : {})}>
        {reorder.order.map((id, i) => {
          const it = byId.get(id);
          if (!it) return null;
          return (
            <div key={id} className={reorder.dragging === id ? "cr-band-dragging" : undefined} {...(owner ? reorder.itemProps(id) : {})}>
              <Band work={it.w} roles={roles} href={it.href} owner={owner} tone={i % 2 === 0 ? "tint" : "plain"} grip={reorder.gripProps(id)} />
            </div>
          );
        })}
      </div>
    </>
  );
}

function Band({ work, roles, href, owner, tone, grip }: { work: WorkCard; roles: Role[]; href: string; owner: boolean; tone: "tint" | "plain"; grip: ReturnType<ReturnType<typeof useLiveReorder>["gripProps"]> }) {
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

  // 왼쪽 카드는 작품의 대표를 따른다: 이미지·영상이면 그것, 글·문서면 문서 카드, 로그라인이면 로그라인 카드.
  const rep = work.rep;
  const hasMedia = (work.media?.length ?? 0) > 0 && (!rep || rep.kind === "image" || rep.kind === "video");
  return (
    <section className={`cr-band ${tone}${off ? " off" : ""}`} aria-labelledby={`cr-band-${work.id}`}>
      <div className="wrap">
        <div className="cr-band-in">
          {hasMedia ? (
            <WorkMedia href={href} items={work.media} />
          ) : (
            // 이미지·영상이 없는 작품: 같은 자리·같은 크기의 카드에 로그라인을 넣는다(제목·태그는 오른쪽, 2026-11-13)
            <Link href={href} className="cr-band-logcard">
              <span className="cr-band-logcard-k">{rep?.kind === "doc" ? rep.label : "로그라인"}</span>
              <span className="cr-band-logcard-t">{rep?.kind === "doc" ? rep.text : work.logline}</span>
            </Link>
          )}
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
                  <button type="button" className="cr-grip" aria-label={`${work.title} 순서 바꾸기(끌어서 옮기거나 위아래 화살표 키)`} {...grip}>
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
            {(hasMedia || rep?.kind === "doc") && <p className="cr-band-log">{work.logline}</p>}
            <div className="cr-band-foot">
              {work.kind && <p className="cr-kind">{work.kind}</p>}
              {/* 등록한 포맷: 역할·장르 태그 줄 바로 위에 따로 한 줄 */}
              <FormatTags formats={work.formats} />
              <div className="cr-band-tags">
                <RoleTags roles={roles} lead />
                {work.genres.length > 0 && (
                  <ul className="cr-genres cr-genres-hash" aria-label="장르">
                    {work.genres.map((g) => (
                      <li key={g}>#{g}</li>
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
