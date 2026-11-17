# 티켓 005 — 미션8 측정 연결 (앱 화면)

상태: 기획 승인 (2026-11-17)

## 목적
공고8 ③ Amplitude 로깅, ④ 로그 QA, ⑤ GA4 세팅을 채운다. 행동 기록을 Amplitude와 GA4(GTM 경유)로도 보내, 미션11 분석에 쓸 데이터를 쌓는다.
기획 기록: claude.ai 프로젝트 「미션」의 `claude/미션8_측정_계획.md`.

## 정한 방식
- GA4는 GTM 한 길로만 보낸다(공고8 결과물이 GTM 태그 설정 화면을 요구한다). `GoogleAnalytics` 컴포넌트·별도 gtag 스크립트는 넣지 않는다.
- Amplitude는 코드의 Browser SDK(`@amplitude/analytics-browser`) 한 길로만 보낸다(교재 13-3). GTM의 Amplitude 태그는 쓰지 않는다.
- 자체 DB 기록(`usage_events`)은 그대로 둔다. 운영자 화면 `/admin/usage`가 쓴다.
- 출입구는 `lib/measure` 하나다. 한 번 기록하면 자체 DB, Amplitude, dataLayer 세 곳으로 간다.
- 서버가 성공을 확정하는 행동(가입, 로그인, AI 평가 결과, 협업 신청 완료)은 서버에서 Amplitude HTTP API로 보낸다. 같은 행동을 브라우저에서 다시 보내지 않는다.

## 고칠 대상
| 파일 | 할 일 |
|---|---|
| `lib/measure/*` | 출입구, 허용 목록 `events.ts`, 스위치 `config.ts`, 처리방침 `privacy-text.ts` |
| `components/planner/planner-editor.tsx` | PDF 내려받기·메일로 받기 성공 때 기록 |
| `app/actions/ai.ts` | AI 평가 결과 받기(성공 때만) |
| `app/actions/collab.ts`의 `createCollab` | 협업 신청 완료(성공 때만) |
| `app/layout.tsx` | GTM 불러오기 |
| 새 마이그레이션 SQL | `usage_events` 허용 목록에 새 행동 4개 추가. 실행은 아키텍터가 한다 |
| `package.json` | `@amplitude/analytics-browser`, `@next/third-parties` 설치 |
| `.env.local.example` | `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_AMPLITUDE_API_KEY`, `NEXT_PUBLIC_AMPLITUDE_SERVER_ZONE` 빈 칸 |

## 행동
- 있는 7개: `planner_open`, `plan_save`, `ai_evaluate_click`, `library_ask`, `portfolio_start_click`, `signup`, `login`
- 새 4개: `plan_pdf_download`, `plan_mail_send`, `ai_evaluate_done`, `collab_submit`

## 사용자 속성
- 로그인한 사람의 내부 번호(user id)를 Amplitude user id로 쓴다.
- 가입 방식.
- 처음 들어온 UTM(source·medium·campaign·content). 홈(티켓 006)이 브라우저에 남긴 값을 읽는다.

## 지킬 조건
- 자동 수집을 끈다(`autocapture:false`, `remoteConfig:{fetchRemoteConfig:false}`).
- 글 내용, 이메일, 이름, 전체 주소는 보내지 않는다.
- 키가 비어 있으면 외부로 보내지 않고 자체 DB에만 기록한다.
- `MEASURE_ENABLED`를 끄면 세 곳 모두 멈춘다.
- 실패한 요청은 완료로 세지 않는다.
- 앱 코드는 `page_view`를 직접 보내지 않는다. 화면 이동은 교재 12부-4의 `spa_page_ready` 방식(목적 경로 제목이 확정된 뒤 이동당 한 번)을 따른다.

## 완료 조건 (화면에서 보여야 할 것)
- dev 미리보기에서 `/planner`를 열면 Amplitude User Profiles → Activity에 `planner_open` 1건.
- 로그라인을 저장하면 GTM Preview에서 태그 1번 실행, GA4 DebugView에 같은 이벤트.
- 빈 입력·실패 응답일 때 성공 이벤트 0건.
- `/privacy`에 GA4·Amplitude로 보낸다는 문장.
- `/admin/usage`에 새 행동 4개가 보인다.

## 손대지 않을 것
- `public/landing.html` (티켓 006)
- 화면 모양과 문구(처리방침만 고친다)
- AI·LLM 동작
- `main` 가지
