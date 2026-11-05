"use client";

import { useFormStatus } from "react-dom";

// 폼 안에서 처리가 끝날 때까지 「처리 중…」으로 바뀌고 잠겨서 두 번 눌리지 않게 하는 제출 버튼.
export function SubmitButton({ className, children, pendingLabel = "처리 중…" }: { className?: string; children: React.ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
