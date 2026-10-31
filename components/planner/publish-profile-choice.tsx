"use client";

import { useState } from "react";

// 비공개 프로필을 이미 가진 사람이 「포트폴리오에 올리기」를 눌렀을 때 열리는 질문(D12 가). 어느 쪽을 골라도 기획안은 공개된다.
// 칸 맨 위 제목 자리에 부르는 쪽이 이 제목을 둔다.
export const profileChoiceTitle = "프로필도 공개할까요?";

export type ProfileChoiceResult = { ok: true } | { ok: false; error?: string };

// withProfile = true: 프로필도 공개하고 기획안을 올림 / false: 프로필은 비공개로 두고 기획안만 올림
export function PublishProfileChoice({
  onChoose,
  onCancel,
}: {
  onChoose: (withProfile: boolean) => Promise<ProfileChoiceResult>;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState<"" | "with" | "only">("");
  const [error, setError] = useState("");

  async function choose(withProfile: boolean) {
    setError("");
    setPending(withProfile ? "with" : "only");
    try {
      const r = await onChoose(withProfile);
      if (!r.ok) setError(r.error ?? "지금은 저장할 수 없어요. 잠시 뒤에 다시 시도해 주세요.");
    } catch {
      setError("지금은 저장할 수 없어요. 잠시 뒤에 다시 시도해 주세요.");
    } finally {
      setPending("");
    }
  }

  return (
    <div className="pp-form" role="group" aria-label={profileChoiceTitle}>
      {error && (
        <p className="pp-err" role="alert" style={{ marginTop: 0 }}>
          {error}
        </p>
      )}
      <div className="row-actions" style={{ marginTop: error ? 12 : 0 }}>
        <button type="button" className="btn btn-primary sm" onClick={() => void choose(true)} disabled={pending !== ""}>
          {pending === "with" ? "올리는 중…" : "프로필도 공개하고 올리기"}
        </button>
        <button type="button" className="btn btn-ghost sm" onClick={() => void choose(false)} disabled={pending !== ""}>
          {pending === "only" ? "올리는 중…" : "기획안만 올리기"}
        </button>
        <button type="button" className="btn btn-ghost sm" onClick={onCancel} disabled={pending !== ""}>
          취소
        </button>
      </div>
    </div>
  );
}
