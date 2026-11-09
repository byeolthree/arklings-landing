"use client";

import { useRouter } from "next/navigation";
import { SAMPLE_CREATORS } from "@/components/creators/sample-data";
import { HeroField } from "@/components/mypage/mypage-preview";
import { PublishProfile, type HandleCheck, type SaveResult } from "@/components/planner/publish-profile";

// 샘플: 프로필 등록 단계(시안 01-B). 칸과 안내 문구는 마이페이지 「크리에이터 등록」과 같고, 저장하면 포트폴리오 등록 단계로 넘어간다. 아무것도 저장하지 않는다.
export function ProfileStep({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  async function checkHandle(handle: string): Promise<HandleCheck> {
    await new Promise((r) => setTimeout(r, 500));
    if (handle === "check-fail") return "error";
    return SAMPLE_CREATORS.some((c) => c.handle === handle) || handle === "taken-name" ? "taken" : "available";
  }
  async function onSubmit(): Promise<SaveResult> {
    await new Promise((r) => setTimeout(r, 600));
    router.push(nextHref);
    return { ok: true };
  }
  return (
    <div className="rg-prof mp">
      <div className="rg-wrap rg-prof-wrap">
        <div className="rg-prof-card mp-card pl mp-pl">
          <PublishProfile mode="create" context="mypage" onSubmit={onSubmit} checkHandle={checkHandle} heroField={<HeroField />} submitLabel="저장하고 포트폴리오 등록으로" />
        </div>
      </div>
    </div>
  );
}
