"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toggleBookmark } from "@/app/actions/projects";
import { AlertPopup } from "@/components/ui/alert-popup";

// 북마크 버튼. 누르면 바로 채워지고(화면이 먼저 바뀐다), 저장(project_bookmarks)이 실패하면 원래대로 돌리고 안내를 띄운다.
// 로그인하지 않았으면 로그인 화면으로 보내고, 로그인하면 이 화면으로 돌아온다.
export function BookmarkButton({ projectId, title, initial, loggedIn, onDark = false }: { projectId: string; title?: string; initial: boolean; loggedIn: boolean; onDark?: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const name = title ? `「${title}」 북마크` : "북마크";

  const click = () => {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (pending) return;
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const result = await toggleBookmark(projectId, next);
      if (!result.ok) {
        setOn(!next);
        setMessage(result.message ?? "북마크를 저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요.");
      }
    });
  };

  return (
    <>
      <button type="button" className={`pj-bm${onDark ? " on-dark" : ""}${on ? " on" : ""}`} aria-label={on ? `${name} 해제` : name} aria-pressed={on} onClick={click}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 4h10v16l-5-3.6L7 20V4Z" />
        </svg>
      </button>
      {message && <AlertPopup onClose={() => setMessage(null)}>{message}</AlertPopup>}
    </>
  );
}
