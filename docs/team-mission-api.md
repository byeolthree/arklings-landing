# 팀 미션 서버 인터페이스 명세서 — 아클링스 「프로젝트」·AI 단가 분석·계약·결제

팀 미션 공고가 요구하는 서버 인터페이스 명세서다. 아클링스는 REST 주소 대신 Next.js Server Action(서버에서만 도는 함수)과 Supabase DB 함수를 쓴다.
항목마다 입력, 출력, 인증, 권한, 부수 효과(함께 바뀌는 것)를 적는다. 화면 쪽 칸 이름과 이동 주소는 `docs/screen-contract.md`, 표 구조는 `docs/team-mission-erd.md`를 본다.

## 공통 규칙
- 인증: 모든 동작은 맨 위에서 로그인과 이메일 확인을 다시 한다. 로그인하지 않았으면 「로그인이 필요해요」, 이메일 확인 전이면 확인 안내를 돌려준다.
- 운영자 동작은 `isAdminUser()`(서버)와 DB의 `is_admin()`이 두 번 막는다.
- DB 연결은 로그인한 본인 권한(`createAuthClient`)만 쓴다. 서버 전용 열쇠는 쓰지 않는다.
- 오류는 DB가 보낸 오류 이름(예: `already_applied`)을 한국어 문장으로 바꿔 돌려준다. 영어 원문은 화면에 내보내지 않는다.
- 공개 사이트(production)에서는 이 기능들이 닫혀 있다(`projectsClosed()`이면 「아직 열려 있지 않아요」 또는 404).
- 금액 단위: 공고 보상은 만 원, 계약·결제는 원.

## 1. 공고 (공고 3.1·3.2)
| 동작 | 파일·함수 | 입력 | 출력 | 권한 | 부수 효과 |
|---|---|---|---|---|---|
| 공고 올리기 | `app/actions/projects.ts` `createProject` | FormData: `title`, `summary`, `description`, `roles[]`, `genres[]`, `reward_min`, `reward_max`(만 원, 둘 다 비우면 협의), `opens_on`, `deadline_on`, `work_starts_on`, `work_ends_on`, `source`, `source_work_id` | `PostState` { `errors`(칸별), `message` } / 성공하면 상세로 이동 | 운영자 | `projects`에 한 줄. 표 검사(제목 2~60자 등)가 한 번 더 막음 |
| 공고 수정 | `updateProject` | 위와 같음 + `project_id` | 같음 | 운영자 | 마감된 공고는 막음. 지원자가 1명 이상이면 보상·마감일은 바꿀 수 없음(서버가 저장값과 비교) |
| 공고 삭제 | `deleteProject` | `project_id` | `ManageState` { `ok`, `message` } | 운영자 | `deleted_at`만 찍음(소프트 삭제). 접수 상태 지원이 남아 있으면 막음 |
| 모집 마감 | `closeProject` → DB `close_project(p_project)` | `project_id` | 같음 | 운영자 | 공고 마감, 접수 지원 자동 거절, 거절된 지원자에게 알림 |
| 예약 마감 | DB `_close_project` (pg_cron `close-expired-projects`, 매일 KST 03:10) | 없음 | 없음 | DB 안에서만 | 마감일 지난 공고 마감·자동 거절·알림 |

## 2. 지원과 선정 (공고 3.2.4)
| 동작 | 파일·함수 | 입력 | 출력 | 권한 | 부수 효과 |
|---|---|---|---|---|---|
| 지원하기 | `applyToProject` → DB `apply_to_project(p_project, p_portfolio, p_motive, p_offer, p_period)` | `project_id`, `portfolio_work_id`, `motive`(10~500자), `offered_reward`(만 원, 선택), `available_period`(선택) | `ApplyState` | 로그인 + 이메일 확인 + 크리에이터 프로필 | `project_applications`에 한 줄, 운영자에게 「새 지원」 알림. 같은 공고 두 번 지원은 `already_applied`로 막음 |
| 수락하며 금액 제시 | `app/actions/contracts.ts` `acceptWithOffer` → DB `accept_with_offer(p_application, p_amount_won, p_days)` | `application_id`, `project_id`, `amount_won`(1만~10억 원), `days`(1~365) | `ContractState` { `ok`, `message`, `contractId` } | 운영자 | 지원 `accepted`, 나머지 접수 지원 자동 거절·알림, 공고 마감, `contracts`에 `offered` 한 줄, 크리에이터에게 「금액 제시」 알림 |
| 거절 | `rejectApplication` → DB `reject_application(p_application)` | `application_id`, `project_id` | `ManageState` | 운영자 | 지원 `rejected`, 지원자에게 알림. 공고는 계속 모집 중 |

## 3. 알림·북마크 (공고 3.3·3.4)
| 동작 | 파일·함수 | 입력 | 출력 | 권한 | 부수 효과 |
|---|---|---|---|---|---|
| 알림 열기 | `app/actions/notifications.ts` `openNotification` | `id` | 알림의 `href`로 이동 | 본인 | DB `mark_notifications_read([id])`로 읽음 표시 |
| 모두 읽음 | `markAllNotificationsRead` | 없음 | 없음 | 본인 | 안 읽은 알림 전부 읽음 |
| 북마크 켜고 끄기 | `toggleBookmark(projectId, on)` | 공고 번호, 켤지 여부 | { `ok`, `message` } | 로그인 + 이메일 확인 | `project_bookmarks` 한 줄 넣기·지우기. 본인 것만 보임 |
| 알림 넣기 | DB `_notify(user, kind, href, body)` | — | — | DB 처리 함수 안에서만 | 앱은 알림을 직접 넣을 수 없음. 종류 13가지(지원·선정·거절·마감 5종 + 계약·결제 8종) |

## 4. AI 단가 분석 (공고 3.5)
| 동작 | 파일·함수 | 입력 | 출력 | 권한 | 부수 효과 |
|---|---|---|---|---|---|
| 단가 분석 | `app/actions/ai-estimate.ts` `estimateProject` | { `title`, `summary`, `description`, `roles[]` } (공고 올리기 칸과 같은 검사) | 성공: { `items`: [{ 기능명, 설명, 예상 단가(원), 산정 근거, 근거 강도 }], `total` } / 실패: 「다시 시도」 안내 | 운영자 | 하루 사용 횟수(`ai_usage`, 기능 이름 `estimate_project`, 운영자 1000번)를 먼저 잡고, 실패하면 돌려줌. OpenAI 호출. 검사(기능 1~12개, 원 단위 정수, 총액 = 단가 합)에 실패하면 한 번만 다시 요청. 저장은 하지 않음(「예산 반영」은 화면이 보상 칸에 넣고, 저장은 공고 올리기·수정으로 함) |
- 단가 근거: `docs/estimate-rates.md`(2026-11-27 확정), 지시문 `lib/prompts/estimate-project.ts`.

## 5. 계약 (공고 3.6.1)
| 동작 | 파일·함수 | 입력 | 출력 | 권한 | 부수 효과 |
|---|---|---|---|---|---|
| 동의/거부 | `respondOffer(contractId, agree)` → DB `respond_offer` | 계약 번호, 동의 여부 | `ContractState` | 그 계약의 크리에이터 | 동의: `signing`, 시작일 = 오늘(KST), 종료일 = 시작일 + 기간, 운영자에게 알림. 거부: `declined`, 지원 거절, 공고 다시 모집 중, 운영자에게 알림 |
| 서명 | `signContract` → DB `sign_contract` | 계약 번호 | 같음 | 당사자 | 서명 시각 기록. 양측 서명이면 `active`(체결), 양측에 알림 |
| 취소 | `cancelContract` → DB `cancel_contract` | 계약 번호 | 같음 | 당사자, 체결 전(`offered`·`signing`)만 | `cancelled`, 지원 거절, 공고 다시 모집 중, 상대에게 알림 |

## 6. 결제·정산 (공고 3.6.2·3.6.3, 토스페이먼츠 테스트)
| 동작 | 파일·함수 | 입력 | 출력 | 권한 | 부수 효과 |
|---|---|---|---|---|---|
| 결제 주문 저장 | `app/actions/payments.ts` `createPaymentOrder` → DB `create_payment_order` | 계약 번호 | { `orderId`, `amountWon` } (금액은 서버가 계약에서 읽음) | 운영자, 계약이 `active`일 때 | `payments`에 `ready` 한 줄. 실패한 주문이 있으면 새 주문번호로 다시 준비 |
| 결제창 | `components/contracts/pay-button.tsx` | `orderId`, `amountWon`, 클라이언트 키 `NEXT_TOSS_CLIENT_KEY` | 토스가 성공·실패 주소로 이동 | 운영자 | 토스 v2 결제창(스크립트 `js.tosspayments.com/v2/standard`) |
| 결제 승인 | `app/payments/success/page.tsx` → `lib/toss.ts` `confirmTossPayment` → DB `mark_payment_paid(p_order, p_payment_key, p_amount_won)` | 토스가 붙여 준 `paymentKey`, `orderId`, `amount` | 결과 화면 | 운영자 | ① 저장 금액과 돌아온 금액이 다르면 승인하지 않고 `failed` ② 같으면 `TOSS_SECRET_KEY`(test_ 키만)로 토스 승인 API 호출 ③ 토스 응답의 상태 DONE·주문번호·금액을 다시 확인 ④ `paid` 기록, 크리에이터에게 알림. 새로고침해도 다시 승인하지 않음 |
| 결제 실패 | `app/payments/fail/page.tsx` | `code`, `message`, `orderId` | 한국어 안내 | 운영자 | 토스 오류 코드를 한국어로 바꿔 보여 줌 |
| 납품 요청 | `requestDelivery` → DB `request_delivery` | 계약 번호 | `ContractState` | 그 계약의 크리에이터, 결제 뒤 | `delivered_at` 기록, 운영자에게 알림 |
| 완료 승인 | `approveCompletion` → DB `approve_completion` | 계약 번호 | 같음 | 운영자, 납품 요청 뒤 | 결제 `paid_out`, 수수료 = 금액 ÷ 10 몫, 정산액 = 금액 − 수수료, 계약 `completed`, 크리에이터에게 알림. 실제 이체는 없음 |
| 결제 내역 | `app/mypage/payments/page.tsx` (읽기 `lib/contracts.ts`) | 없음 | 결제 목록 | 운영자는 전체, 크리에이터는 자기 계약 | 읽기만 |

## 7. 만들지 않은 것
- 토스 웹훅, 환불(공고 3.6.4, 도전), 상호 리뷰(공고 3.7).
