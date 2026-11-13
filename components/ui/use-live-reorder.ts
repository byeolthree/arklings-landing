"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";

// 손잡이(⠿)로 순서를 바꾸는 목록이 모두 같이 쓰는 동작(2026-11-14).
// - 끄는 동안: 줄이 마우스를 따라 그 자리로 바로 옮겨 보인다.
// - 손을 놓으면: 보이는 순서 그대로 save를 한 번 부른다. save가 false를 돌려주면 원래 순서로 되돌린다.
// - 줄과 줄 사이 틈에 놓아도 된다(목록 전체가 놓는 자리).
// - 키보드: 손잡이에서 위·아래 화살표로 한 칸씩 옮기고 바로 저장한다.
// ids는 지금 화면에 그릴 순서(서버 순서)다. ids가 바뀌면(저장 뒤 새로 불러오면) 그 순서를 따른다.
export function useLiveReorder(ids: string[], save: (next: string[]) => Promise<boolean> | boolean) {
  const key = ids.join("|");
  // 바꾼 순서는 그때의 서버 순서(base)와 함께 둔다. 서버 순서가 달라지면 바꾼 순서는 버리고 서버 순서를 따른다.
  const [moved, setMoved] = useState<{ base: string; ids: string[] } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const live = useRef<string[] | null>(null);
  const dragId = useRef<string | null>(null);
  const shown = moved && moved.base === key ? moved.ids : ids;
  const setOrder = (next: string[] | null) => setMoved(next ? { base: key, ids: next } : null);

  function place(id: string, to: number) {
    const next = (live.current ?? shown).slice();
    const from = next.indexOf(id);
    if (from < 0 || to < 0 || to >= next.length || from === to) return;
    next.splice(from, 1);
    next.splice(to, 0, id);
    live.current = next;
    setOrder(next);
  }

  async function commit() {
    const next = live.current;
    dragId.current = null;
    setDragging(null);
    if (!next || next.join("|") === key) {
      live.current = null;
      setOrder(null);
      return;
    }
    const ok = await save(next);
    if (!ok) {
      live.current = null;
      setOrder(null);
    }
  }

  const listProps = {
    onDragOver: (e: DragEvent) => {
      if (dragId.current) e.preventDefault();
    },
    onDrop: (e: DragEvent) => {
      if (!dragId.current) return;
      e.preventDefault();
      void commit();
    },
  };

  const itemProps = (id: string) => ({
    onDragEnter: () => {
      if (dragId.current && dragId.current !== id) place(dragId.current, (live.current ?? shown).indexOf(id));
    },
  });

  const gripProps = (id: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      dragId.current = id;
      live.current = shown.slice();
      setDragging(id);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    },
    onDragEnd: () => {
      if (dragId.current) void commit();
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      live.current = shown.slice();
      place(id, shown.indexOf(id) + (e.key === "ArrowUp" ? -1 : 1));
      void commit();
    },
  });

  return { order: shown, dragging, listProps, itemProps, gripProps };
}
