import type { Role } from "@/lib/collab";

// 역할 태그 색. 역할마다 서로 다른 색을 쓰고, 같은 역할은 늘 같은 색이다(색을 보고 분야를 알아볼 수 있게).
// 색은 컬러 시스템(AGENTS.md 「디자인 토큰」)에서 상태(semantic) 색, 제목 색, 배경 색을 뺀 나머지만 쓴다.
//   대본 자주(primary/jaju) · 영상 제작 더스티 블루(secondary/dusty-blue) · 아트디렉터 황금(accent/gold)
//   역사 자문 뮤트 세이지(secondary/muted-sage) · 책임 프로듀서 청록(secondary/teal) · 기타 본문색(neutral/body)
export type RoleTone = "teal" | "dusty" | "gold" | "sage" | "jaju" | "body";

export const ROLE_TONE: Record<Role, RoleTone> = {
  script: "jaju",
  video: "dusty",
  art_director: "gold",
  history_advisor: "sage",
  producer: "teal",
  other: "body",
};
