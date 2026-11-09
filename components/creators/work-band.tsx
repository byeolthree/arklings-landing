"use client";

import Link from "next/link";
import { useState } from "react";
import { RoleTags } from "./role-tags";
import type { WorkCard } from "./types";
import { WorkMedia } from "./work-media";

// 프로필의 작품 한 섹션(시안 03·08). 왼쪽 대표 이미지·영상, 오른쪽 제목·로그라인·종류·역할·장르.
// 주인이 자기 프로필을 볼 때만 제목 줄 오른쪽에 공개 스위치와 순서 손잡이가 붙는다(스위치 저장·순서 저장은 서버에 아직 없어서 이 화면 안에서만 움직인다).
export function WorkBand({ work, href, owner, tone }: { work: WorkCard; href: string; owner: boolean; tone: "tint" | "plain" }) {
  const [pub, setPub] = useState(work.isPublic !== false);
  const off = owner && !pub;
  return (
    <section className={`cr-band ${tone}${off ? " off" : ""}`} aria-labelledby={`cr-band-${work.id}`}>
      <div className="wrap">
        <div className="cr-band-in">
          <WorkMedia href={href} slides={["〈대표 이미지〉", "〈영상〉"]} />
          <div className="cr-band-body">
            <div className="cr-band-title">
              <h3 id={`cr-band-${work.id}`} className="cr-work-title">
                <Link href={href}>{work.title}</Link>
              </h3>
              {owner && (
                <div className="cr-ctl">
                  <button type="button" role="switch" aria-checked={pub} aria-label={`${work.title} 공개`} className="cr-sw" onClick={() => setPub((v) => !v)}>
                    <i aria-hidden="true" />
                    <span>{pub ? "공개" : "비공개"}</span>
                  </button>
                  <button type="button" className="cr-grip" aria-label={`${work.title} 순서 바꾸기(끌어서 옮김)`}>
                    ⠿
                  </button>
                </div>
              )}
            </div>
            <p className="cr-band-log">{work.logline}</p>
            <div className="cr-band-foot">
              <p className="cr-kind">{work.kind}</p>
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
