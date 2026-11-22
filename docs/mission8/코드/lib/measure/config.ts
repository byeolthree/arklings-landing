// 측정 도구(방문 통계 + 사용 기록 + GA4·Amplitude 연결) 전체의 켜고 끄는 스위치. 이 폴더 안에서 한 곳뿐이다.
// false로 바꾸면: 방문 통계 부품이 아무것도 그리지 않고, 브라우저·서버의 사용 기록과 GTM·Amplitude 전송이 모두 멈추고, /api/events는 받아도 남기지 않으며, /privacy의 「서비스 이용 기록」 구역이 사라진다.
// 예외: 홈(public/landing.html)의 방문 통계 스크립트·GTM·Amplitude는 고정 HTML이라 이 스위치로 꺼지지 않는다. 그 부분은 직접 지운다(docs/measure-removal.md).
// 들어내는 방법: docs/measure-removal.md
export const MEASURE_ENABLED = true;

// 외부 분석 도구 설정(티켓 005). 값은 Vercel 환경 변수에만 넣는다. 비어 있으면 그 도구로는 아무것도 보내지 않는다.
// NEXT_PUBLIC_ 값은 브라우저 코드에 그대로 들어가므로 process.env.이름을 이 모양 그대로 적어야 한다.
const rawGtm = (process.env.NEXT_PUBLIC_GTM_ID ?? "").trim();
export const GTM_ID = /^GTM-[A-Z0-9]{4,12}$/.test(rawGtm) ? rawGtm : "";
export const AMPLITUDE_API_KEY = (process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ?? "").trim();
export const AMPLITUDE_SERVER_ZONE: "US" | "EU" = (process.env.NEXT_PUBLIC_AMPLITUDE_SERVER_ZONE ?? "").trim().toUpperCase() === "EU" ? "EU" : "US";

// 홈(티켓 006)이 브라우저에 남기는 「처음 들어온 UTM」을 담는 이름. 홈과 앱이 같은 글자를 쓴다.
export const FIRST_UTM_KEY = "arklings_first_utm";
