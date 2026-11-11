"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/track";
import type { UsageEvent } from "@/lib/usage-events";

// 화면을 열었을 때 사용 기록을 한 번 남긴다(행동의 종류만 남기고 글 내용은 보내지 않는다).
// 기획안 편집기처럼 주소가 바뀔 때 다시 그려지는 부품 밖에 두어, 저장해서 주소가 바뀌어도 「열기」가 다시 세어지지 않게 한다.
export function TrackOnMount({ event }: { event: UsageEvent }) {
  useEffect(() => {
    trackEvent(event);
  }, [event]);
  return null;
}
