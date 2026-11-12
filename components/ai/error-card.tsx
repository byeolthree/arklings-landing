"use client";

import Link from "next/link";
import "./ai.css";
import { AlertPopup } from "@/components/ui/alert-popup";

// 시안의 오류 안내 카드: 위에 회색 라벨 알약, 느낌표 원형 아이콘, 굵은 제목, 설명, (있으면) 단추.
export type ErrorAction = { label: string; kind: "primary" | "line"; href?: string; onClick?: () => void };

export function ErrorCard({ pill, title, desc, action }: { pill: string; title: string; desc: string; action?: ErrorAction }) {
  const act =
    action &&
    (action.href ? (
      <Link href={action.href} className={`ai-btn sm${action.kind === "line" ? " line" : ""}`}>
        {action.label}
      </Link>
    ) : (
      <button type="button" className={`ai-btn sm${action.kind === "line" ? " line" : ""}`} onClick={action.onClick}>
        {action.label}
      </button>
    ));
  void pill;
  return (
    <AlertPopup key={title + desc} actions={act}>
      <div>{title}</div>
      <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 400 }}>{desc}</p>
    </AlertPopup>
  );
}
