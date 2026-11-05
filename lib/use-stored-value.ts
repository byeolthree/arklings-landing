"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

// 이 브라우저에 저장된 글자(localStorage)를 읽는다. 서버에서 그릴 때와 저장소를 쓸 수 없을 때는 빈 글자.
export function useStoredValue(key: string): string {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );
}
