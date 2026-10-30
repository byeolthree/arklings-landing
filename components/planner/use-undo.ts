"use client";

import { useCallback, useRef, useState } from "react";

// 기획안 편집 화면 전용 되돌리기(Ctrl+Z)·다시 하기 기록.
// 글자를 이어서 치는 동안(같은 key, 1초 이내)은 한 번에 묶어서, 한 번 되돌리면 "방금 친 한 덩어리"가 사라진다.
// 브라우저 기본 되돌리기는 자동으로 채워지는 문장 때문에 어긋나므로 따로 만든다.
const COALESCE_MS = 1000;
const MAX_STEPS = 200;

export function useUndo<T>(initial: T) {
  const ref = useRef<T>(initial);
  const [present, setPresent] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const last = useRef<{ key: string | null; at: number }>({ key: null, at: 0 });
  const [flags, setFlags] = useState({ canUndo: false, canRedo: false });
  const refreshFlags = useCallback(() => setFlags({ canUndo: past.current.length > 0, canRedo: future.current.length > 0 }), []);

  const commit = useCallback((next: T, key?: string, record = true) => {
    const cur = ref.current;
    if (Object.is(next, cur)) return;
    const now = Date.now();
    const joined = key !== undefined && last.current.key === key && now - last.current.at < COALESCE_MS;
    if (record && !joined) {
      past.current.push(cur);
      if (past.current.length > MAX_STEPS) past.current.shift();
    }
    if (record) future.current = [];
    last.current = { key: key ?? null, at: now };
    ref.current = next;
    setPresent(next);
    refreshFlags();
  }, [refreshFlags]);

  const update = useCallback((fn: (cur: T) => T, key?: string) => commit(fn(ref.current), key), [commit]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (prev === undefined) return false;
    future.current.push(ref.current);
    ref.current = prev;
    last.current = { key: null, at: 0 };
    setPresent(prev);
    refreshFlags();
    return true;
  }, [refreshFlags]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next === undefined) return false;
    past.current.push(ref.current);
    ref.current = next;
    last.current = { key: null, at: 0 };
    setPresent(next);
    refreshFlags();
    return true;
  }, [refreshFlags]);

  return {
    value: present,
    update,
    set: (next: T) => commit(next),
    undo,
    redo,
    canUndo: flags.canUndo,
    canRedo: flags.canRedo,
  };
}
