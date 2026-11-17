"use client";

import { GoogleTagManager } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { doNotTrack } from "@/lib/measure/anon";
import { GTM_ID, MEASURE_ENABLED } from "@/lib/measure/config";
import { pushDataLayer, setMeasureIdentity } from "@/lib/measure/external";

// GTM(구글 태그 관리자) 불러오기. GA4는 이 한 길로만 보낸다. ID가 비었거나 측정이 꺼졌거나 「추적 안 함」이면 불러오지 않는다.
export function MeasureGtm() {
  // 서버가 그릴 때는 false, 브라우저에서만 「추적 안 함」을 확인한다
  const on = useSyncExternalStore(
    () => () => {},
    () => MEASURE_ENABLED && GTM_ID !== "" && !doNotTrack(),
    () => false,
  );
  return on ? <GoogleTagManager gtmId={GTM_ID} /> : null;
}

// 화면 이동이 끝나 제목이 정해지면 이동당 한 번 spa_page_ready를 dataLayer에 보낸다(교재 12부-4). 앱 코드는 page_view를 직접 보내지 않는다.
// 처음 열 때는 바로, 화면을 옮길 때는 제목(<title>)이 바뀐 것을 본 뒤(제목이 같은 화면이면 1초 뒤)에 보낸다. 주소는 경로만 보낸다(? 뒤 값 제외).
export function SpaPageReady() {
  const pathname = usePathname();
  const last = useRef<{ path: string; title: string } | null>(null);
  useEffect(() => {
    if (!MEASURE_ENABLED || !GTM_ID || doNotTrack()) return;
    const prev = last.current;
    if (prev?.path === pathname) return;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const obs = new MutationObserver(() => {
      if (document.title !== prev?.title) fire();
    });
    function fire() {
      if (done) return;
      done = true;
      obs.disconnect();
      clearTimeout(timer);
      last.current = { path: pathname, title: document.title };
      pushDataLayer({ event: "spa_page_ready", page_path: pathname, page_title: document.title });
    }
    if (!prev || document.title !== prev.title) {
      fire();
    } else {
      obs.observe(document.head, { childList: true, subtree: true, characterData: true });
      timer = setTimeout(fire, 1000);
    }
    return () => {
      done = true;
      obs.disconnect();
      clearTimeout(timer);
    };
  }, [pathname]);
  return null;
}

// 서버가 그린 로그인 정보를 Amplitude 사용자 속성으로 넘긴다.
export function MeasureIdentityClient({ userId, method }: { userId: string | null; method: string | null }) {
  useEffect(() => {
    if (MEASURE_ENABLED) setMeasureIdentity(userId, method);
  }, [userId, method]);
  return null;
}
