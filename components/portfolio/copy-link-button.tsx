"use client";

import { useState } from "react";

// 지금 보고 있는 주소를 그대로 복사한다(다른 사람에게 보낼 수 있게).
export function CopyLinkButton() {
  const [msg, setMsg] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMsg("주소를 복사했어요.");
    } catch {
      setMsg("복사하지 못했어요. 주소창의 주소를 직접 복사해 주세요.");
    }
  }
  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={copy}>
        링크 복사
      </button>
      <span role="status" aria-live="polite" className="text-[13px]">
        {msg}
      </span>
    </>
  );
}
