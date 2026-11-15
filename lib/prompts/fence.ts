// 자료 구분선(<자료> … </자료>). 사용자 글이나 참고 자료 안에 같은 글자가 들어 있어도 자료 밖으로 빠져나가지 못하게 바꿔 둔다.
// AI 평가(evaluate-logline.ts)와 라이브러리 질의응답(library-ask.ts)이 같은 울타리를 쓴다.
export const FENCE_OPEN = "<자료>";
export const FENCE_CLOSE = "</자료>";

export function fence(text: string): string {
  return text.replaceAll(FENCE_OPEN, "〈자료〉").replaceAll(FENCE_CLOSE, "〈/자료〉");
}
