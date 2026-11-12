import type { Metadata } from "next";
import { LibraryChat } from "@/components/ai/library-chat";
import { getCurrentUser } from "@/lib/auth";
import { readAiRemaining } from "@/lib/ai/usage";
import { createAuthClient } from "@/lib/supabase/server";
import { readPublicWiki } from "@/lib/wiki";

export const metadata: Metadata = {
  title: "라이브러리",
  description: "아클링스가 정리한 열국시대부터 삼한일통기까지의 질문과 답을 읽고, 자료 안에서 AI에게 물어볼 수 있어요.",
};
export const dynamic = "force-dynamic";

// 라이브러리(미션7-2). 게시된 Q&A 목록(위키의 공개 항목)은 누구나 보고, 질문 칸은 로그인한 사람(이메일 확인까지)만 쓴다.
// 위키를 읽지 못한 것(오류)과 항목이 없는 것(빈 상태)을 나눠 화면에 넘긴다.
export default async function LibraryPage() {
  const user = await getCurrentUser();
  const confirmed = Boolean(user?.email && user.emailConfirmed);

  let items: Awaited<ReturnType<typeof readPublicWiki>> = { ok: false };
  let remaining: number | null = null;
  try {
    const sb = await createAuthClient();
    items = await readPublicWiki(sb);
    if (confirmed) remaining = await readAiRemaining(sb, "library_ask");
  } catch {
    // 연결 설정이 없거나 읽지 못하면 목록은 「불러오지 못했어요」로 보인다
  }

  // 로그인은 했지만 이메일 확인 전이면 이메일 확인으로, 로그인 전이면 로그인으로 보낸다(끝나면 이 화면으로 돌아온다).
  const loginHref = user ? "/auth/add-email?next=%2Flibrary" : "/login?next=%2Flibrary";
  return <LibraryChat items={items.ok ? items.items : []} listError={!items.ok} loggedIn={confirmed} loginHref={loginHref} initialRemaining={remaining} />;
}
