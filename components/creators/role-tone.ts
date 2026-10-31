import type { Role } from "@/lib/collab";

// 역할 태그 색. 같은 분야끼리 같은 색으로 묶는다(보조 색 세 가지).
//   청록: 글·자료 쪽(대본, 역사 자문) / 더스티 블루: 보이는 것 쪽(영상 제작, 아트디렉터) / 뮤트 세이지: 운영·기타(책임 프로듀서, 기타)
export type Tone = "teal" | "dusty" | "sage";

export const ROLE_TONE: Record<Role, Tone> = {
  script: "teal",
  history_advisor: "teal",
  video: "dusty",
  art_director: "dusty",
  producer: "sage",
  other: "sage",
};
