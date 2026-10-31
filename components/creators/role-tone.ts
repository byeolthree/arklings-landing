import type { Role } from "@/lib/collab";

// 역할 태그 색. 역할마다 서로 다른 색을 쓰고, 같은 역할은 늘 같은 색이다(색을 보고 분야를 알아볼 수 있게).
// 색은 컬러 시스템(AGENTS.md 「디자인 토큰」)에서만 가져온다.
//   대본 청록(secondary/teal) · 영상 제작 파랑(semantic/info) · 아트디렉터 황금(accent/gold)
//   역사 자문 빨강(semantic/error) · 책임 프로듀서 초록(semantic/success) · 기타 더스티 블루(secondary/dusty-blue)
export type RoleTone = "teal" | "blue" | "gold" | "red" | "green" | "dusty";

export const ROLE_TONE: Record<Role, RoleTone> = {
  script: "teal",
  video: "blue",
  art_director: "gold",
  history_advisor: "red",
  producer: "green",
  other: "dusty",
};
