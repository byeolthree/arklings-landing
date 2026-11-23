"use client";

import { useState } from "react";

// 북마크 버튼. 누르면 채워지고 다시 누르면 풀린다. 이 화면 안의 상태일 뿐이라 저장하지 않고, 새로고침하면 사라진다(저장은 다음 단계).
export function BookmarkButton({ onDark = false, title }: { onDark?: boolean; title?: string }) {
  const [on, setOn] = useState(false);
  const name = title ? `「${title}」 북마크` : "북마크";
  return (
    <button type="button" className={`pj-bm${onDark ? " on-dark" : ""}${on ? " on" : ""}`} aria-label={on ? `${name} 해제` : name} aria-pressed={on} onClick={() => setOn((v) => !v)}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4h10v16l-5-3.6L7 20V4Z" />
      </svg>
    </button>
  );
}
