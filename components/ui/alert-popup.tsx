"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

// 오류·안내를 화면 가운데 팝업으로 띄운다. 가운데 정렬 글 아래에 가운데 정렬 「확인」 단추가 있다.
export function AlertPopup({
  children,
  actions,
  onClose,
}: {
  children: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  if (!open || !mounted) return null;
  const close = () => {
    setOpen(false);
    onClose?.();
  };
  return createPortal(
    <div role="alertdialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 16, background: "rgba(42,32,37,.45)" }}>
      <div style={{ width: "100%", maxWidth: 340, padding: "28px 24px 24px", borderRadius: 16, background: "#fff", textAlign: "center", color: "#2a2025", fontSize: 15, fontWeight: 400, lineHeight: 1.6, whiteSpace: "pre-line" }}>
        <div>{children}</div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {actions}
          <button type="button" autoFocus onClick={close} style={{ height: 40, padding: "0 28px", border: 0, borderRadius: 999, background: "#a61e5c", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// 저장 전에 한 번 더 묻는 팝업. 가운데 정렬 글 아래에 가운데 정렬 단추 둘(확인 쪽 · 취소 쪽)이 있다.
export function ConfirmPopup({
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  if (!mounted) return null;
  const btn = { height: 40, padding: "0 24px", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer" } as const;
  return createPortal(
    <div role="alertdialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 16, background: "rgba(42,32,37,.45)" }}>
      <div style={{ width: "100%", maxWidth: 360, padding: "28px 24px 24px", borderRadius: 16, background: "#fff", textAlign: "center", color: "#2a2025", fontSize: 15, fontWeight: 400, lineHeight: 1.6, whiteSpace: "pre-line" }}>
        <div>{children}</div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {cancelLabel && onCancel && (
            <button type="button" onClick={onCancel} style={{ ...btn, border: "1px solid #a61e5c", background: "#fff", color: "#a61e5c" }}>
              {cancelLabel}
            </button>
          )}
          <button type="button" autoFocus onClick={onConfirm} style={{ ...btn, border: 0, background: "#a61e5c", color: "#fff" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
