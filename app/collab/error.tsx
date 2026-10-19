"use client";

import { PaperCard, PaperPage, primaryBtn } from "@/components/paper-card";

export default function CollabError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PaperPage>
      <PaperCard className="text-center">
        <div role="alert">
          <p className="text-[15px] font-bold text-[#292126]">신청 정보를 불러오지 못했습니다.</p>
          <p className="mt-1 text-[13px] text-[#574a4f]">잠시 후 다시 시도해 주세요.</p>
          <button onClick={reset} className={`${primaryBtn} mt-5`}>다시 시도</button>
        </div>
      </PaperCard>
    </PaperPage>
  );
}
