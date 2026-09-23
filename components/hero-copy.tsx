"use client";

import { useState } from "react";

const fullCopy = [
  "C.S.루이스와 톨킨이 활동했던 판타지 문학 클럽 '잉클링스' (Inklings)를 모티브로 하여 아클링스(Arklings)라는 이름을 구상했습니다.",
  "잉클링스가 상실된 신화의 흔적을 문학(Ink)으로 복원했던 것처럼 아클링스 또한 파편화된 한국 고대의 역사와 신화, 설화를 방주에(Ark) 보존하여 여러 창작자가 함께 사용할 수 있는 서사 유산으로 물려주겠다는 의미를 담고 있습니다.",
  "아클링스는 한국 고대 공동 유산을 데이터에 보존하고, 여러 창작자가 그 유산을 바탕으로 하나의 공유세계관을 함께 구축하는 IP 기업입니다.",
];

export function HeroCopy() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[15px] font-bold leading-[1.3] text-title md:text-[22px]">
        아클링스: 한국 신화·고대사 기반 IP 스튜디오
      </h2>
      <p className="hidden text-sm leading-[22px] text-body md:block">
        {fullCopy.join(" ")}
      </p>
      <div className="md:hidden">
        <p className="text-[13px] leading-5 text-body">
          아클링스(Arklings)는 C.S.루이스와 톨킨이 활동했던 옥스퍼드의 판타지 문학
          클럽 &apos;잉클링스&apos;(Inklings)를 모티브로 한 이름입니다.
        </p>
        {expanded ? (
          <p className="mt-2 text-[13px] leading-5 text-body">
            {fullCopy.slice(1).join(" ")}
          </p>
        ) : null}
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1 text-xs text-[#666]"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          더 알아보기
          <span aria-hidden="true">{expanded ? "⌃" : "⌄"}</span>
        </button>
      </div>
    </div>
  );
}
