# 팀 미션(WorkBridge 기준) ERD — 아클링스 「프로젝트」·계약·결제

팀 미션 공고가 요구하는 ERD(표 관계도)다. 공고의 8개 핵심 데이터(사용자·프로필·프로젝트·지원·알림·북마크·계약·결제)를 아클링스 표에 맞춰 그렸다.
리뷰(공고 3.7)는 만들지 않았으므로 표가 없다. 기준 SQL: `supabase/migrations/0002`, `0003`, `0010`대(크리에이터), `0017`, `0029`~`0035`.

## 관계도

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "공개 이름"
  AUTH_USERS ||--o| ADMINS : "운영자 표시"
  AUTH_USERS ||--o| CREATOR_PROFILES : "크리에이터 프로필"
  AUTH_USERS ||--o{ CREATOR_WORKS : "포트폴리오 작품"
  AUTH_USERS ||--o{ PROJECTS : "공고 올림(운영자)"
  SOURCE_WORKS |o--o{ PROJECTS : "연결 작품(선택)"
  PROJECTS ||--o{ PROJECT_APPLICATIONS : "지원"
  AUTH_USERS ||--o{ PROJECT_APPLICATIONS : "지원자(크리에이터)"
  CREATOR_WORKS |o--o{ PROJECT_APPLICATIONS : "첨부 포트폴리오"
  AUTH_USERS ||--o{ PROJECT_BOOKMARKS : "북마크"
  PROJECTS ||--o{ PROJECT_BOOKMARKS : "북마크됨"
  AUTH_USERS ||--o{ NOTIFICATIONS : "받는 알림"
  PROJECT_APPLICATIONS ||--o| CONTRACTS : "수락 때 계약 하나"
  PROJECTS ||--o{ CONTRACTS : "계약(진행 중은 하나)"
  CONTRACTS ||--o| PAYMENTS : "결제 하나"
  AUTH_USERS ||--o{ AI_USAGE : "AI 하루 사용 횟수"

  PROFILES { uuid id PK "auth.users.id" text display_name }
  ADMINS { uuid user_id PK }
  CREATOR_PROFILES { uuid user_id PK text public_handle "text[] roles" boolean is_public }
  CREATOR_WORKS { uuid id PK uuid owner_id FK text title "text[] roles" boolean is_public }
  SOURCE_WORKS { uuid id PK text title }
  PROJECTS {
    uuid id PK
    text title
    text summary
    text description
    text_array roles
    text_array genres
    int reward_min "만 원"
    int reward_max "만 원"
    date opens_on
    date deadline_on
    text source "arklings | request"
    uuid source_work_id FK
    uuid posted_by FK
    timestamptz closed_at "함수만 바꿈"
    timestamptz deleted_at "소프트 삭제"
  }
  PROJECT_APPLICATIONS {
    uuid id PK
    uuid project_id FK
    uuid applicant_id FK
    uuid portfolio_work_id FK
    text motive
    int offered_reward "만 원"
    text available_period
    text status "received | accepted | rejected"
    timestamptz decided_at
  }
  PROJECT_BOOKMARKS { uuid user_id PK uuid project_id PK }
  NOTIFICATIONS { uuid id PK uuid user_id FK text kind text href text body timestamptz read_at }
  CONTRACTS {
    uuid id PK
    uuid project_id FK
    uuid application_id FK "unique"
    uuid admin_id FK
    uuid creator_id FK
    int amount_won "원"
    int days
    text status "offered | declined | signing | active | cancelled | completed"
    date starts_on
    date ends_on
    timestamptz admin_signed_at
    timestamptz creator_signed_at
  }
  PAYMENTS {
    uuid id PK
    uuid contract_id FK "unique"
    text order_id "unique"
    int amount_won
    text payment_key
    text status "ready | paid | paid_out | failed"
    timestamptz approved_at
    timestamptz delivered_at
    timestamptz completed_at
    int fee_won "금액 ÷ 10 몫"
    int payout_won
  }
  AI_USAGE { uuid user_id PK text feature PK date day PK int calls }
```

## 상태 흐름

| 대상 | 흐름 |
|---|---|
| 공고 | 모집 중(`closed_at` 비어 있음) → 마감(수락·직접 마감·마감일 지남). 계약이 거부·취소되면 다시 모집 중 |
| 지원 | `received` → `accepted` 또는 `rejected`. 한 공고에 수락은 하나. 수락하면 나머지 접수 지원은 자동 거절 |
| 계약 | `offered` → `signing`(동의) 또는 `declined`(거부) → `active`(양측 서명) → `completed`(완료 승인). 체결 전에는 `cancelled` 가능 |
| 결제 | `ready`(주문 저장) → `paid`(토스 승인) → `paid_out`(완료 승인·정산 기록). 실패하면 `failed`, 새 주문번호로 다시 `ready` |

## 권한 원칙
- 화면(브라우저)은 표를 읽기만 하고, 상태 변경은 DB 처리 함수(security definer)로만 한다.
- 공고 쓰기·지원 처리·결제 주문·완료 승인은 운영자(`is_admin()`)만, 지원·동의·납품 요청은 본인만 한다.
- 계약·결제는 당사자(크리에이터 본인과 운영자)만 읽는다. 알림·북마크는 본인만 읽는다.
