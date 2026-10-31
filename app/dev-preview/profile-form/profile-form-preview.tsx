"use client";

import { useState } from "react";
import { SAMPLE_CREATORS } from "@/components/creators/sample-data";
import { PublishProfile, type HandleCheck, type SaveResult } from "@/components/planner/publish-profile";
import type { ProfileValues } from "@/lib/creator-rules";

type Mode = "new" | "edit" | "taken" | "fail";

// 샘플 미리보기용: 실제 저장 없이 저장 결과(성공·주소 중복·저장 실패)를 흉내 낸다.
export function ProfileFormPreview({ mode }: { mode: Mode }) {
  const [open, setOpen] = useState(true);
  const [saved, setSaved] = useState<ProfileValues | null>(null);

  // 샘플의 중복 확인: 샘플 크리에이터들의 공개 주소와 "taken-name"은 이미 쓰는 주소로 본다. "check-fail"은 확인 실패를 흉내 낸다.
  async function checkHandle(handle: string): Promise<HandleCheck> {
    await new Promise((r) => setTimeout(r, 500));
    if (handle === "check-fail") return "error";
    return SAMPLE_CREATORS.some((c) => c.handle === handle) || handle === "taken-name" ? "taken" : "available";
  }

  async function onSubmit(value: ProfileValues): Promise<SaveResult> {
    await new Promise((r) => setTimeout(r, 700));
    if (mode === "taken" && value.handle !== "free-name") return { ok: false, errors: { handle: "이미 쓰고 있는 공개 주소예요. 다른 주소를 적어 주세요." } };
    if (mode === "fail") return { ok: false, error: "지금은 저장할 수 없어요. 잠시 뒤에 다시 시도해 주세요." };
    setSaved(value);
    setOpen(false);
    return { ok: true };
  }

  return (
    <div className="pl">
      <div className="wrap" style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
        <section className="panel" style={{ marginTop: 0 }}>
          <div className="pub-box">
            <p>
              포트폴리오 <span className="pub-state">공개하지 않음</span>
            </p>
            {saved && (
              <p style={{ marginTop: 10 }} role="status">
                저장했어요(샘플): <b>/creators/{saved.handle}</b> · 역할 {saved.roles.length}개 · 소개 {saved.bio.length}자
              </p>
            )}
            {!open && (
              <div className="row-actions">
                <button type="button" className="btn btn-primary sm" onClick={() => setOpen(true)}>
                  포트폴리오에 올리기
                </button>
              </div>
            )}
            {open && (
              <PublishProfile
                key={mode}
                mode={mode === "edit" ? "edit" : "create"}
                initial={mode === "edit" ? { handle: "jian-lee", roles: ["script"], bio: "사라지는 기억과 기록하는 사람을 쓰는 대본 작가예요." } : undefined}
                displayName="이지안"
                onSubmit={onSubmit}
                onCancel={() => setOpen(false)}
                checkHandle={mode === "edit" ? undefined : checkHandle}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
