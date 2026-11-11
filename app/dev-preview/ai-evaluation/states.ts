// 미리보기 상태 이름(서버 페이지와 화면 부품이 함께 쓴다). 디자인이 끝나면 지운다.
export const EVAL_STATES: Record<string, string> = {
  ready: "평가 전(다섯 칸 채움, 눌러 보기)",
  missing: "평가 전(빈 칸 있음)",
  loading: "호출 중",
  result: "결과",
  login: "로그인 안 함",
  input: "입력 너무 김",
  limit: "횟수 소진",
  auth: "AI 연결 문제",
  busy: "요청 몰림",
  retry: "일시 오류·시간 초과",
  schema: "결과 읽기 실패",
};
