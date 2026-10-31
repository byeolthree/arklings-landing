"use client";

import { useState } from "react";
import { SAMPLE_CREATORS } from "@/components/creators/sample-data";
import { profileFormTitle, PublishProfile, type HandleCheck, type SaveResult } from "@/components/planner/publish-profile";
import { profileChoiceTitle, PublishProfileChoice } from "@/components/planner/publish-profile-choice";
import type { ProfileValues } from "@/lib/creator-rules";

export type Mode = "planner" | "planner-private" | "mypage" | "edit" | "taken" | "fail";

// 샘플 미리보기용: 실제 저장 없이 저장 결과(성공·주소 중복·저장 실패)를 흉내 낸다.
// planner-private = 비공개 프로필을 이미 가진 사람이 올릴 때 「프로필도 공개할까요?」를 묻는 칸
// planner = 기획안을 올리다가 열리는 칸(필수 칸만), mypage = 마이페이지에서 처음 만들기, edit = 마이페이지에서 고치기
export function ProfileFormPreview({ mode }: { mode: Mode }) {
  const [open, setOpen] = useState(true);
  const [saved, setSaved] = useState<ProfileValues | null>(null);
  const [chosen, setChosen] = useState<boolean | null>(null);
  const context = mode === "planner" ? "planner" : "mypage";
  const editing = mode === "edit";

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

  if (mode === "planner-private") {
    return (
      <div className="pl">
        <div className="wrap" style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
          <section className="panel" style={{ marginTop: 0 }}>
            <h2>{profileChoiceTitle}</h2>
            <div className="pub-box">
              {chosen !== null && (
                <p role="status">{chosen ? "프로필도 공개하고 기획안을 올렸어요(샘플)." : "기획안만 올렸어요(샘플). 프로필은 비공개로 남아 있어요."}</p>
              )}
              {chosen === null ? (
                <PublishProfileChoice
                  onChoose={async (withProfile) => {
                    await new Promise((r) => setTimeout(r, 700));
                    setChosen(withProfile);
                    return { ok: true };
                  }}
                  onCancel={() => setChosen(null)}
                />
              ) : (
                <div className="row-actions">
                  <button type="button" className="btn btn-primary sm" onClick={() => setChosen(null)}>
                    다시 열기
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="pl">
      <div className="wrap" style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
        <section className="panel" style={{ marginTop: 0 }}>
          <h2>{profileFormTitle(editing ? "edit" : "create")}</h2>
          <div className="pub-box">
            {saved && (
              <p style={{ marginTop: 10 }} role="status">
                저장했어요(샘플): <b>/creators/{saved.handle}</b> · 역할 {saved.roles.length}개 · 한 줄 소개 {saved.bio.length}자 · 소개 글 {saved.about.length}자 · 채널 {saved.channels.length}개 · 협업 신청 {saved.openToCollab ? "받음" : "안 받음"} · {saved.isPublic ? "공개" : "비공개"}
              </p>
            )}
            {!open && (
              <div className="row-actions">
                <button type="button" className="btn btn-primary sm" onClick={() => setOpen(true)}>
                  다시 열기
                </button>
              </div>
            )}
            {open && (
              <PublishProfile
                key={mode}
                mode={editing ? "edit" : "create"}
                context={context}
                initial={
                  editing
                    ? {
                        handle: "jian-lee",
                        roles: ["script", "video"],
                        bio: "사라지는 기억과 기록하는 사람을 쓰는 대본 작가예요.",
                        about: "소금비 내리는 나라 같은 이야기를 씁니다. 단편 대본과 시리즈 구성을 주로 하고, 영상 작업자와의 협업을 찾고 있어요.",
                        channels: [{ label: "인스타그램", url: "https://instagram.com/jian.lee" }],
                        openToCollab: true,
                        isPublic: false,
                      }
                    : undefined
                }
                onSubmit={onSubmit}
                onCancel={() => setOpen(false)}
                checkHandle={editing ? undefined : checkHandle}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
