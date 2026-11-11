import type { WikiItem } from "@/components/ai/types";

// 샘플 위키 항목(가짜). 실제 자료는 아키텍터가 Supabase에 넣는다. 디자인이 끝나면 지운다.
export const SAMPLE_WIKI: WikiItem[] = [
  { id: "w1", question: "사다함은 어떤 인물인가요?", answer: "신라 진흥왕 때의 화랑으로, 가야 정벌에 공을 세운 인물로 전해져요.\n자세한 연대와 직위는 확인이 필요한 부분이에요.", source: "아클링스 인물 정리 1", era: "삼한일통기" },
  { id: "w2", question: "화랑은 무엇을 하던 집단인가요?", answer: "청소년 무리를 이끌며 심신을 닦고 나라에 쓰이던 조직이에요. 이 위키에서는 이야기의 배경 설정으로 다뤄요.", source: "아클링스 설정 정리 2", era: "삼한일통기" },
  { id: "w3", question: "열국시대에는 어떤 나라들이 있었나요?", answer: "부여, 옥저, 동예, 삼한의 여러 나라처럼 작은 나라들이 나란히 있던 시기로 다뤄요.", source: "아클링스 시대 정리 1", era: "열국시대" },
];
export const SAMPLE_STREAM = "사다함은 신라 진흥왕 때의 화랑으로, 가야 정벌에 공을 세운 인물로 전해져요. 자세한 연대와 직위는 확인이 필요해요.";
export const SAMPLE_SOURCES = ["아클링스 인물 정리 1"];
