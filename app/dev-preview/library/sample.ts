import type { WikiItem } from "@/components/ai/types";

// 샘플 위키 항목(가짜). 실제 자료는 아키텍터가 Supabase에 넣는다. 디자인이 끝나면 지운다.
export const SAMPLE_WIKI: WikiItem[] = [
  { id: "w1", question: "열국시대는 어떤 시기인가요?", answer: "부여, 옥저, 동예, 삼한의 여러 나라처럼 작은 나라들이 나란히 있던 시기로 다뤄요.\n이 라이브러리에서는 이야기의 배경이 되는 큰 흐름만 정리해 두었어요.", source: "자료 이름 가", era: "열국시대" },
  { id: "w2", question: "화랑은 어떤 조직이었나요?", answer: "청소년 무리를 이끌며 몸과 마음을 닦고 나라의 일에 쓰이던 조직으로 다뤄요.", source: "자료 이름 나", era: "삼한일통기" },
  { id: "w3", question: "사다함은 어떤 인물인가요?", answer: "신라 진흥왕 때의 화랑으로, 가야 정벌에 공을 세운 인물로 전해져요. 자세한 연대와 직위는 확인이 필요해요.", source: "자료 이름 다", era: "삼한일통기" },
  { id: "w4", question: "삼한일통기에는 무슨 일이 있었나요?", answer: "신라가 여러 나라와 싸우고 손을 잡으며 한반도의 판도를 바꾸던 시기로 다뤄요.", source: "자료 이름 라", era: "삼한일통기" },
];
export const SAMPLE_STREAM = "화랑은 청소년들이 무리를 이루어 몸과 마음을 닦고, 나라의 일에 쓰이던 조직으로 다뤄요. 이 자료에서는 이야기의 배경이 되는 설정으로 정리돼 있어요.";
export const SAMPLE_SOURCES = ["자료 이름 A", "자료 이름 B"];
