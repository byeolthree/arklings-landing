// 측정 도구(방문 통계 + 사용 기록) 전체의 켜고 끄는 스위치. 이 폴더 안에서 한 곳뿐이다.
// false로 바꾸면: 방문 통계 부품이 아무것도 그리지 않고, 브라우저·서버의 사용 기록이 멈추고, /api/events는 받아도 남기지 않으며, /privacy의 「서비스 이용 기록」 구역이 사라진다.
// 예외: 홈(public/landing.html)의 방문 통계 스크립트 한 줄은 고정 HTML이라 이 스위치로 꺼지지 않는다. 그 줄은 직접 지운다(docs/measure-removal.md).
// 들어내는 방법: docs/measure-removal.md
export const MEASURE_ENABLED = true;
