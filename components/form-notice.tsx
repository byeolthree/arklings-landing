"use client";

import { useEffect, useRef } from "react";

// 입력 화면의 오류·안내 문구. 모든 화면에서 카드 맨 아래에 가운데 정렬로 보인다.
// 문구가 나타나면 화면 밖에 있어도 보이도록 스크롤한다.
export function FormNotice({ message }: { message?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [message]);
  if (!message) return null;
  return (
    <p
      ref={ref}
      role="alert"
      className="mt-5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-center text-[12px] leading-normal text-destructive md:text-[13px]"
    >
      {message.split(/(?<=\.) /).map((part, i) => (
        <span key={i}>
          {i > 0 && <br className="md:hidden" />}
          {i > 0 && " "}
          {part}
        </span>
      ))}
    </p>
  );
}
