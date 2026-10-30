<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 아클링스 작업 규칙 (미션 7 기준)

## 아클링스 목적

아클링스는 한국 고대사 기반 IP를 여러 크리에이터가 함께 만드는 참여형 제작 스튜디오다.
미션 7에서는 로그인(유저 기능)과 기획안 서버 저장을 붙여, 기획안을 아클링스 포트폴리오에 올리고 작업을 이어 갈 수 있게 한다.
홈 CTA는 「협업 신청」이며 목적지는 협업 신청 페이지다. 기획안 질문이 실제 내용으로 채워지기 전까지는 홈의 「지금 시작하기」 버튼도 협업 신청(`/collab/new`)으로 보낸다.

## 기술 스택

Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase(DB·Storage·로그인), Server Actions. 배포는 Vercel.

## 미션 7 범위

만든다 (단계 순서는 아래 「미션 7 단계」):

- 로그인: 이메일, 구글, 카카오. 이메일 소유가 확인된 같은 이메일은 같은 계정으로 이어 준다.
- 마이페이지, 기획안 서버 저장·임시저장 이력·PDF 내려받기·메일 받기, 포트폴리오 공개 화면
- 협업 신청: 로그인 없이 접수, 받는 사람(아클링스 또는 기획안 주인)만 목록·상세·수정·삭제
- 개인정보 동의 문구와 `/privacy`, 알림·확인 메일, 탈퇴와 3개월 자동 삭제

만들지 않는다:

- OpenAI·AI 평가 (나중에 붙일 수 있게 구조만 막지 않는다)
- 결제, 후원
- 별도 운영자 계정 (아키텍터의 평소 계정에 서버 내부 표시만 달아 운영자로 취급한다)
- 첫 화면 용량 줄이기, 링크 미리보기 이미지, 방문자 분석 도구 (미션 7이 끝난 뒤)
- 정적 스튜디오 피드와 스튜디오 화면 (나중에 별도로 추가)
- SNS에서 들어온 사용자가 홈을 거치지 않고 스튜디오 콘텐츠로 직접 접속하는 흐름

## Figma 원칙

Figma MCP는 자동 구현 도구가 아니라 디자인 근거를 읽는 도구로 사용한다.
시안에서 색상, 타이포그래피, 간격, 모서리, 이미지, 배치를 확인하고, 구현 결과를 Figma와 비교해 차이가 큰 부분을 보정한다.
Figma 시안과 제품 요구가 충돌하면 임의로 결정하지 않고 먼저 보고한다.

## 디자인 토큰 (Figma 조회 없이 우선 참고)

Figma MCP로 매번 조회하기 전에 아래 표를 먼저 참고한다. 값이 안 맞거나 새 화면에 없는 값이 필요할 때만 Figma MCP로 확인한다.
아래 수치는 스타일 가이드 변수와 미션5 화면(홈 `205:3`/`205:33`, 협업 신청 `332:2`/`332:26`)을 2026-09-23 기준으로 다시 읽은 값이다.

### 컬러

| 역할 | 이름 | HEX |
|---|---|---|
| Primary (버튼·강조·CTA) | primary/jaju | `#A61E5C` |
| Secondary 1 · Nav/Footer 구분선 | secondary/teal | `#1F5A66` |
| Secondary 2 | secondary/dusty-blue | `#5F7C99` |
| Secondary 3 (가장 연함) | secondary/muted-sage | `#6F8A7A` |
| Accent (진행 중 상태 등) | accent/gold | `#D89A24` |
| 배경 | neutral/background | `#FAF7F8` |
| 테두리 (입력·연한 카드) | neutral/border | `#E8DFE3` |
| 본문 텍스트 | neutral/body | `#574A50` |
| 제목 텍스트 | neutral/title | `#2A2025` |
| 성공 | semantic/success | `#16794B` |
| 경고 | semantic/warning | `#B45309` |
| 오류 | semantic/error | `#C83A3A` |
| 정보 | semantic/info | `#2463A7` |

주의:
- `accent/gold` 배경에는 흰 텍스트를 쓰지 않는다(명도 대비 미달). `neutral/title` 같은 어두운 텍스트를 올린다.
- Nav 하단·Footer 상단 구분선은 `neutral/border`가 아니라 `secondary/teal`이다.
- 시안 일부 레이어는 `#292126`, `#574A4F`, `#333`을 하드코딩한다. 토큰이 있으면 `neutral/title`·`neutral/body`를 쓴다.

### 타이포그래피 (Noto Sans KR 기본)

스타일 가이드의 `UI/Section Title`은 14px이지만, 홈 시안은 `UI/Home Section Title` 22px / 모바일 15px을 쓴다. 미션5 화면은 홈·신청 시안 크기를 따른다.

| 용도 | 데스크톱 | 모바일 | 굵기 | 색상 |
|---|---|---|---|---|
| 로고(워드마크, Nav) | 24px | 22px | Bold | primary/jaju |
| 내비게이션 메뉴 | 15px | 햄버거 18px | Regular | neutral/body (활성 시 neutral/title) |
| 홈 섹션·히어로 제목 | 22px / lh 1.3 | 15px / lh 1.3 | Bold | neutral/title |
| 페이지 제목 (협업 신청) | 20px / lh 28 (`UI/Heading L`) | 18px / lh 26 (`UI/Heading M`) | Bold | neutral/title |
| 스튜디오 피드 페이지 제목 | 24px | 18px | Bold | 시안은 `#333` · Inter. 구현 시 Noto Sans KR Bold + `neutral/title`로 맞출지 확인 |
| 카드 소제목 (아이디어 입력/결과) | 18px | 12px | Bold | `#292126` (title에 가깝다) |
| 본문 | 14px / lh 22 (`UI/Body`) | 12~13px | Regular | neutral/body |
| 메타 (작품 회차 등) | 13px / lh 20 (`UI/Meta`) | 12px | Regular | neutral/body |
| 라벨 | 12px / lh 16 Medium (`UI/Label`) | 12px Medium | Medium | neutral/title |
| 캡션·역할 칩 | 12px / lh 18 (`UI/Caption`) | 12px | Regular | neutral/body |
| 배지·관련 자료 | 11px | 11px | Regular | 흰 글자 또는 title (gold/sage는 어두운 글자) |
| 홈 아이디어 보조 문구 | 14px | 10px | Regular | `#574A4F` |
| Primary 버튼 (Nav·칩 CTA) | 13px Bold | 13px Bold | Bold | 흰 글자 또는 primary/jaju (Secondary) |
| 신청 제출 버튼 | 16px / lh 22 Medium (`UI/Button L`) | 15px / lh 20 Medium (`UI/Button`) | Medium | 흰 글자 |
| 푸터 브랜드 | 18px Bold | 14px Bold | Bold | `#292126` |
| 푸터 설명·카피 | 12px / 11px | 10px | Regular | neutral/body |
| 작품·유닛 제목 (홈 협업 캡션·스튜디오 카드·유닛 상세) | 16px / lh 1.3 · Noto Serif KR Bold | 12px / lh 1.3 · Noto Serif KR Bold | Bold | neutral/title |

### 간격 (시안 변수)

| 용도 | 데스크톱 | 모바일 |
|---|---|---|
| 페이지 좌우 여백 | 80px | 16px |
| 페이지 상하 (프레임 padding) | 위 40px | 16px |
| 헤더·푸터와 본문 간격 | 80px (`여백/헤더-푸터 간격 (웹, 80)`) | 40px |
| 홈 섹션 사이 | 160px (`여백/섹션 간격 (웹, 160)`) | 80px |
| 그 외 | 8px 그리드 (8/16/24/32/40px) | 동일 |

### 컴포넌트 규칙

- **버튼(Primary, Nav)**: `primary/jaju` 배경, 흰 텍스트, 13px Bold, `padding: 8px 20px`, `border-radius: 8px`, 그림자 없음.
- **버튼(Secondary, 실현하기)**: 배경 없음, `1.5px solid primary/jaju`, 글자 `primary/jaju` 13px Bold, 모서리 8px.
- **신청 제출 버튼**: 가로 100%, `primary/jaju`, 흰 텍스트, `border-radius: 6px`, 데스크톱 `padding-y: 16px` / 모바일 `14px`.
- **카드 (아이디어 입력·결과)**: `border-radius: 12px`, 그림자 `0 4px 12px rgba(0,0,0,0.08)` (`Card Shadow`). 입력 카드는 `neutral/border` 배경에 가깝게 채움.
- **입력창**: `border: 1px solid neutral/border`, `border-radius: 6px`, 높이 데스크톱 48px / 모바일 44px (원하는 것은 데스크톱 120px / 모바일 100px).
- **배지(국가·상태, 관련 자료)**: 채움. 관련 자료는 `border-radius: 999px`. 스튜디오 유닛 배지는 시안 `12px` 모서리. gold/sage/일부 국가 배지는 어두운 글자.
- **역할 칩 (홈 협업)**: 페이지 배경 + `1px solid neutral/border`, `border-radius: 20px`, 12px 본문색. 채워진 semantic 배지와 모양이 다르다.
- **내비게이션 바**: 페이지와 같은 `neutral/background`. 하단 `1px solid secondary/teal`. 좌측 로고, 우측 끝에 Primary 「협업 신청」. 데스크톱 메뉴 간격 32px, 세로 패딩 24px. 모바일은 로고+햄버거, 세로 패딩 16px.
- **푸터**: 상단 `1px solid secondary/teal`.
- **이미지 자리**: 실제 이미지 없을 때(스튜디오 썸네일) `neutral/background` + `1px solid #8C8C8C`, 진한 회색 박스로 채우지 않는다. 모서리 8px. 데스크톱 높이 200px / 모바일 160px.
- **필터 칩 (스튜디오)**: 테두리 `#8C8C8C`, `border-radius: 20px`, 데스크톱 13px / 모바일 12px. 펼침 동작은 시안에 없음.

## 검수 원칙

기능마다 모바일과 데스크톱에서 확인한다.
이미지 alt, 링크와 버튼의 역할, 깨진 링크, 누락 이미지, Console 오류를 확인한다.
커밋·배포 전에 `npm run build`와 `npm run lint`를 실행한다. (테스트 도구는 아직 없다.)
시험에는 가짜 이메일·가짜 값만 쓴다. 실제 운영 전에는 전문가 확인을 한 번 받는다.

## Git 작업 흐름

일상 구현과 검수는 `dev`에서만 한다.
`dev`에는 기능·수정 단위로 커밋하고, 승인 없이 올린 뒤에 결과를 보고한다.
커밋 전에는 변경 파일과 검수 결과를 확인하고, 범위 밖 파일이나 비밀값을 포함하지 않는다.
`main` 병합, `main` 푸시, 강제 푸시, Vercel 배포는 사용자가 명시적으로 승인할 때만 한다.
`dev`에만 있는 `.claude/settings.json`(훅)과 `CLAUDE.md`의 형식 검증 정책은 미션 7과 무관하므로 `main`에 반영하지 않는다.

## 작업 시작 원칙

새 기능이나 큰 변경은 현재 프로젝트, 요구사항, Figma 시안, 수정할 파일, 검수 방법을 먼저 확인해 계획을 세우고 사용자 승인을 받은 뒤 구현한다.
승인된 계획 범위 안의 수정, 서버 실행, 검수, 로컬 커밋은 다시 묻지 않고 진행한다.
작업 보고 끝에는 남은 위험을 적는다.

## 승인 필요 작업

새 패키지 설치, 외부 서비스 연결, 환경 변수 추가, 개인정보 처리, 결제 또는 비용 발생 작업은 사용자 승인 없이 진행하지 않는다.
파일 삭제는 훅이 막는다. 지울 파일과 이유를 먼저 설명하고 허락받은 뒤에만 한다.

## 협업 신청과 로그인 (미션 6~7, Supabase)

스택: Next.js Server Actions + Supabase(DB, Storage, 로그인). 실제 개인정보는 받지 않고 테스트 값만 쓴다(실제 운영 전 전문가 확인).

### 미션 7 단계

0. 준비·임시 조치: 규칙 파일 정리, 협업 신청 목록 임시 비밀번호(단계 2에서 로그인으로 대체됨), 첨부 보관함 비공개, 검색엔진 차단, 시각 KST, 메인 버튼
1. 이메일 로그인·프로필·동의 문구·`/privacy`
2. 협업 신청: 받는 사람 구조·RLS·알림 메일·봇 방지·파일 검사
3. 기획안: 서버 저장·이력·Ctrl+Z·PDF·메일·공개 여부
4. 구글·카카오 로그인·계정 이어주기 (구현 완료, 진짜 서비스 확인 대기)
5. 포트폴리오 페이지: `/portfolio`·`/portfolio/[id]`, 상세의 「협업 신청」(받는 사람 = 기획안 주인), 이메일 확인 안 한 계정 막기 (구현 완료, `0007_portfolio.sql`)
6. 탈퇴·3개월 자동 삭제·정리 작업
7. README·QA·배포 점검

### 테이블

- `source_works`: id, title(unique), sort_order, created_at. 신청 대상 3건(악의 꽃, 사다함의 꿈, 단 하나의 꿈).
- `collab_requests`: id(uuid), applicant_name, contact(이메일 또는 전화번호), sns_handle, source_work_id(→source_works, 비면 "특정 이야기 아님"), roles(text[], 1개 이상), idea(10~1000자), portfolio_url(http/https), consent(true만 허용), attachment_path·attachment_name(선택), status, created_at, updated_at(트리거 자동 갱신). 단계 2에서 받는 사람 칸(`recipient_kind`, `recipient_id`, `plan_id`)이 더해진다.
- `roles` 값: video / script / art_director / history_advisor / producer / other
- `status` 값: received(접수, 기본) / reviewing(검토 중) / accepted(수락) / rejected(거절)
- 화면은 Figma 「미션5 아클링스 웹·모바일」 파일의 협업 신청 시안(노드 346:2, 346:539, 355:16, 355:49)을 따른다. 칸을 바꾸려면 시안과 SQL을 함께 고친다.
- `profiles`(공개 이름만, 이메일은 복사하지 않음)와 `profile_consents`(동의 기록, 본인만 읽기)는 `0002_profiles.sql`이 만든다. 가입하면 트리거가 자동으로 채운다.
- 기획안(`0004_plans.sql`): `plans`(주인·제목·공개 여부·공개용 사본 `public_content`. 공개된 것만 누구나 읽고 쓰기는 주인만, 사람당 30건), `plan_revisions`(「임시저장」 한 번 = 한 건. 고른 선택지 `selections` / 아클링스 제안 문장 `suggested`(만든 방식 `method` 포함) / 사용자가 고친 문장 `edited`를 따로 담는다. 주인만 읽고 쓰고 지우며 기획안당 100건), `mail_usage`(기획안 PDF 메일 하루 3번 제한, 앱이 직접 못 만지고 `reserve_plan_mail()`·`release_plan_mail()` 함수로만 센다). `collab_requests.plan_id`는 `plans`를 가리키고, 기획안이 지워지면 신청은 남고 연결만 비워진다.
- 포트폴리오(`0007_portfolio.sql`): `plans.first_published_at`(처음 공개한 시각. DB 트리거가 처음 공개할 때 한 번만 찍고 앱이 못 바꾼다. 기존 `published_at`은 다시 공개할 때마다 덮어써지는 「마지막 공개 시각」으로 둔다), 보기(view) `portfolio_items`(공개된 기획안의 id·제목·처음 공개한 시각·공개 이름·공개용 사본만. 주인 번호·이메일·임시저장 이력은 없다. 호출한 사람의 권한(RLS)으로 읽는다), `is_email_confirmed()`(이메일 확인을 마친 계정인지), 기획안 신청 때 받는 사람을 기획안 주인으로 정하는 트리거. 화면에 보이는 날짜는 포트폴리오 목록·상세 모두 「게시일」(처음 공개한 날) 하나이고, 만든 시각·고친 시각은 포트폴리오에 띄우지 않는다.
- 새 표는 단계가 진행되면서 `supabase/migrations/`에 추가한다.
- 동의 문구는 `lib/consent.ts` 한 곳에서만 쓴다(가입·협업 신청·`/privacy`가 같은 글). 문구를 고치면 `CONSENT_VERSION`도 올린다.

### SQL 변경 규칙

- `supabase/schema.sql`은 미션 6 최초 구조다. 다시 실행하면 `collab_requests`를 지우므로 **다시 실행하지 않는다.**
- 구조 변경은 `supabase/migrations/000N_이름.sql` 새 파일로 만든다. 기존 데이터를 지우지 않고 여러 번 실행해도 안전하게 쓴다. 아키텍터가 Supabase SQL Editor에서 번호 순서대로 실행한다. (`0007`은 `0004`가 만든 기획안 표를 쓰므로 반드시 `0006` 다음에 실행한다.)

### Storage

- 버킷 `collab-attachments`: **비공개**(마이그레이션 `0001`, `0003`), PDF·JPG·PNG, 4MB 이하 (Vercel 요청 크기 한도 4.5MB 때문). 올리기·읽기·삭제는 **서버 전용 열쇠로 앱 서버만** 한다(로그인 없는 정책 없음). 파일 경로는 `collab_requests.attachment_path`에 저장하고, 받는 사람에게는 서버가 만든 **5분짜리 임시 주소**로만 보여 준다. 신청을 삭제하면 파일도 함께 지운다. 올릴 때는 파일 앞 글자(시그니처)까지 서버가 확인한다(`lib/collab-file.ts`).

### 환경 변수 (이름만 기록, 값은 `.env.local`과 Vercel에만)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`: 서버 전용 열쇠. 접수 저장·첨부 파일·메일 받는 사람 조회에만 `lib/supabase/admin.ts`로 쓴다. 쓰기 전에 반드시 권한을 먼저 확인한다.
- `RATE_LIMIT_SALT` (선택): 봇 방지용 접속 주소 해시에 섞는 글자
- `MAIL_SMTP_HOST`, `MAIL_SMTP_PORT`, `MAIL_SMTP_USER`, `MAIL_SMTP_PASS`, `MAIL_FROM`: 메일 발송 설정(아키텍터의 기존 네이버 메일). 코드에 직접 쓰지 않는다.
- `ADMIN_NOTIFY_EMAIL`: 아클링스 앞 새 신청 알림을 받을 주소
- `CRON_SECRET`: 정기 정리 작업(`/api/cron/cleanup`)을 부를 때 확인하는 비밀값. 없으면 누구도 실행할 수 없다(항상 401). Vercel 예약 작업이 이 값을 자동으로 실어 보낸다.

새 변수는 사용자 승인 후 추가한다.

### 기획안 (단계 3)

- 화면 `/planner`(`?plan=<id>`로 내 기획안 열기). 로그인 없이도 쓸 수 있고 이 기기 브라우저에만 자동 보관된다. 서버 저장·PDF·메일은 로그인해야 하며, 로그인 안 한 내용은 서버에 저장하지 않는다. 옛 주소 `/planner.html`은 `next.config.ts`가 `/planner`로 보낸다(`public/planner.html` 파일은 삭제 허락을 받기 전까지 남겨 둔다).
- 내용의 모양과 검사 규칙은 `lib/plans.ts` 한 곳(화면·서버 공통). 「아클링스가 제안한 문장」은 `buildSuggestion()` 한 함수에서만 만든다(나중에 AI 문장도 이 자리와 `method` 값으로). 서버는 화면이 보낸 제안 문장을 믿지 않고 칸 내용에서 다시 만든다.
- 서버 동작은 `app/actions/plans.ts`(저장·이력 불러오기·고치기·삭제·공개·PDF·메일). 모든 동작이 맨 위에서 로그인을 다시 확인하고, 로그인한 본인의 권한(RLS)으로 실행한다. PDF는 Route Handler가 아니라 Server Action이 만들어(Server Action은 출처 검사가 기본으로 붙는다) 화면이 내려받게 한다. 메일은 받는 주소를 요청에서 받지 않고 로그인 계정의 확인된 이메일만 쓴다.
- PDF: `pdfkit` + `assets/fonts/NotoSansKR-*.otf`(SIL OFL 1.1, 라이선스 `assets/fonts/OFL.txt`). `next.config.ts`에서 `pdfkit`을 번들에서 빼고(`serverExternalPackages`) 글꼴을 `/planner` 화면에 실어 보낸다(`outputFileTracingIncludes`).
- 되돌리기(Ctrl+Z)는 `components/planner/use-undo.ts`의 자체 기록이다(자동으로 채워지는 문장 때문에 브라우저 기본 되돌리기는 어긋난다).

### 탈퇴와 정리 작업 (단계 6)

- 탈퇴: `/mypage/withdraw`(안내 → 체크 + 「탈퇴합니다」 입력 → `app/actions/account.ts`) → `/withdrawn`. 서버 전용 열쇠로 계정을 지우면 프로필·동의 기록·기획안·이력·메일 횟수가 DB의 연쇄 삭제로 함께 지워진다. 내 앞 협업 신청은 `recipient_id`가 비워져 아무도 못 보다가 3개월 뒤 지워진다. 운영자 표시(`admins`)가 있는 계정은 표시를 옮기기 전에는 탈퇴할 수 없다.
- 정리 작업: `vercel.json`이 하루 한 번(UTC 18:17 = KST 03:17) `/api/cron/cleanup`을 부른다. `CRON_SECRET`이 맞을 때만 `lib/cleanup.ts`의 `runCleanup()`이 실행된다: ① 접수 3개월 지난 협업 신청과 첨부 파일 삭제(파일을 먼저 지우고, 파일 삭제가 실패하면 신청을 남겨 다음 실행에 다시 시도) ② 신청과 연결 안 된 하루 넘은 짝 없는 파일 삭제 ③ 48시간 지난 봇 방지 기록·3일 지난 메일 횟수 기록 삭제. 결과는 `cleanup_runs`(0005, 서버 전용)에 남으며, 실패하면 `ok=false`와 오류 종류가 적힌다.

### 소셜 로그인과 계정 이어주기 (단계 4)

- 로그인 방식 목록·표시 이름·요청 옵션은 `lib/providers.ts` 한 곳(나중에 네이버 같은 방식은 여기에 한 줄 더하고 Supabase 설정을 켠다). 버튼은 `components/social-buttons.tsx`(동의 체크 뒤에만 작동), 시작은 `app/actions/social.ts`의 `startOAuth`, 돌아오는 곳은 `/auth/callback`(실패·취소는 `/auth/social-failed` 안내 화면). 카카오에는 `profile_nickname profile_image` 권한만 요청한다. 동의한 문구 버전은 쿠키로 들고 와 callback에서 기록한다.
- 이메일 소유가 확인된 같은 이메일(구글 등)은 Supabase 자동 연결에 맡긴다. 이메일 없이 들어온 계정(카카오)은 확인 전까지 `requireUser`가 `/auth/add-email`로 보낸다(기획안 저장 동작도 막는다).
  - 아무도 안 쓰는 이메일: `updateUser({email})` → 확인 메일 → `/auth/confirm`(type=email_change) → 계정에 이메일이 붙는다.
  - 이미 다른 계정이 쓰는 이메일: 화면은 똑같은 안내만 보이고(존재 여부 비공개), 그 이메일로 로그인 링크를 보낸다. 주인이 링크를 누르면 `/auth/link-social`에서 요청한 이름·시각을 보고 **직접 승인**해야만(`finishSocialLink`) 빈 임시 계정을 지우고 소셜 로그인을 그 계정에 붙인다(이메일 없음·기획안 없음일 때만 지우고, 확인하지 못하면 지우지 않는다). 요청 기록은 `pending_identity_links`(0006, 1시간 유효).
- 마이페이지에서 방법 추가·해제(`startLinkIdentity`/`unlinkProvider`, 항상 1개 이상 남김). 비밀번호 설정·재설정은 `/forgot-password` → 메일 → `/reset-password`(소셜 전용 계정도 이 길로 이메일 로그인을 추가). 정리 작업이 이메일 없이 7일 지난 빈 계정을 지운다.
- Supabase 설정 확인표와 진짜 서비스에서 확인할 항목: `supabase/social-setup.md`. 이메일 템플릿: `supabase/email-templates.md`.

### 포트폴리오 (단계 5)

- `/portfolio`(목록, 10개씩, 처음 공개한 순서 최근 먼저)와 `/portfolio/[id]`(상세, [id]는 기획안 UUID)는 로그인 없이 열린다. 읽기는 `lib/portfolio.ts` 한 곳이며 DB의 `portfolio_items` 보기에서만 읽는다. 작성자는 공개 이름(`profiles.display_name`)을 읽을 때마다 가져오므로(기획안에 복사하지 않는다) 이름을 바꾸면 바로 반영된다. 주인 번호는 화면·주소·화면 소스 어디에도 내보내지 않는다. 공개를 껐거나 지워졌거나 없는 주소는 404 화면(`app/portfolio/not-found.tsx`)이다. 포트폴리오에는 공개한 완성본(`public_content`) 하나만 나오고 임시저장 이력은 나오지 않는다.
- 올리기·내리기는 기획안 화면의 「포트폴리오에 올리기」·「포트폴리오에서 내리기」(`setPlanPublic`)이고, 올릴지 말지는 작성자가 고른다.
- 상세의 「협업 신청」은 `/collab/new?plan=<기획안 UUID>`로 간다. 화면은 받는 사람 번호를 받지 않는다. `createCollab`이 `plan_id`로 기획안을 찾아 공개 중인지, 주인이 이메일 확인을 마쳤는지 확인하고 받는 사람(`recipient_kind=user`, `recipient_id`=주인)을 정하며, DB 트리거가 저장 순간에 같은 규칙을 한 번 더 적용한다(앱이 다른 값을 보내도 주인으로 바뀌고, 공개가 꺼졌으면 `plan_not_public`으로 막힌다). 신청 화면에는 작품 고르는 칸 대신 기획안 제목과 「○○님께 전달됩니다」가 보인다. 알림 메일은 받는 사람(주인)에게 간다. `plan` 없이 들어온 신청(랜딩)은 지금처럼 아클링스(운영자)가 받는다.
- `lib/portfolio-sample.ts`는 1단계 시험용 가짜 데이터라 지금은 쓰지 않는다(삭제 허락을 받기 전까지 남겨 둔다).

### 이메일 확인 규칙 (카카오 등 이메일 없이 들어온 계정)

- 소셜 로그인은 로그인이 끝나는 순간 Supabase가 계정을 먼저 만들므로 「확인 안 한 계정」이 잠깐 생기는 것은 막을 수 없다. 대신 그 계정은 이메일 확인을 마칠 때까지 아무것도 할 수 없게 막는다.
- 화면: `requireUser`가 `/auth/add-email`로 보낸다. 서버 동작: 공개 이름 고치기, 비밀번호 정하기, 로그인 방법 추가·해제, 받은 신청 고치기·지우기, 기획안 동작(`needUser`)은 맨 위에서 `isConfirmed()`를 다시 확인한다. DB: `0007`이 기획안·임시저장 이력·공개 이름 만들기·고치기와 받은 신청 고치기·지우기를 `is_email_confirmed()`로 막아 앱을 거치지 않고 DB를 직접 열어도 안 된다.
- 실제 Supabase 설정에서 「Confirm email」(이메일 확인 필수)이 켜져 있어야 하고, 「Secure email change」 설정은 `supabase/social-setup.md` 확인표대로 한 통만 오는지 본다.

### 화면 경로

`/collab/new`(누구나 접수), `/collab/done`(접수 안내만), `/collab`(**받은 협업 신청** 목록, 10개씩, 로그인 필요), `/collab/[id]`, `/collab/[id]/edit`(받는 사람만). `/apply`는 `/collab/new`로 이동. 남에게 온 신청이나 없는 id는 404. `/collab/gate`는 로그인 화면으로 보낸다(예전 임시 비밀번호 화면은 없어졌다).

받는 사람 규칙(0003, 0007): 신청마다 `recipient_kind`(`arklings`/`user`)와 `recipient_id`가 있다. 읽기·수정·삭제는 받는 사람만 하고, 아클링스 앞 신청은 `admins` 표에 UUID가 있는 계정(운영자 표시, 화면에는 안 보임)이 본다. 접수(INSERT)는 DB에 열려 있지 않고 서버가 검사 뒤 서버 전용 열쇠로 저장한다. 봇 방지는 숨은 칸(`extra_note`)과 접속 주소 해시 기준 횟수 제한(1시간 5건·하루 20건, `lib/ratelimit.ts`)이다. 새 신청 알림·접수 확인 메일은 `lib/collab-notify.ts`가 응답 뒤에(`after`) 보내며, 실패해도 접수에는 영향이 없다.

마이페이지 `/mypage`에는 내 기획안 목록(공개 여부·수정 시각)이 있다.

로그인(단계 1): `/signup`(가입), `/login`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/add-email`, `/auth/link-social`, `/auth/social-failed`, `/mypage`(로그인 필요), `/auth/confirm`(이메일 확인 링크가 들어오는 곳), `/auth/link-expired`(링크 만료 안내), `/privacy`(개인정보처리방침). 로그인 뒤 돌아갈 주소(`next`)는 `lib/safe-next.ts`로 같은 사이트 안 경로만 허용한다. 로그인 쿠키는 `proxy.ts`가 새로고침하고, 서버 코드는 `lib/supabase/server.ts`의 `createAuthClient()`와 `lib/auth.ts`의 `getCurrentUser()`·`requireUser()`로 확인한다. 기존 협업 신청 코드는 로그인 없는 연결(`lib/supabase.ts`)을 그대로 쓴다.

### 규칙

- 저장은 Server Actions로만 한다. mock 데이터·localStorage를 최종 저장소로 쓰지 않는다(기획안의 브라우저 임시 저장은 비로그인 사용자용 임시 보관일 뿐이다).
- Server Action은 따로 열려 있는 입구이므로, 화면에서 막았더라도 **각 Action 안에서 다시 권한을 확인한다.** 수정·삭제는 로그인한 본인의 권한으로 실행해 DB 규칙(RLS)이 한 번 더 막게 한다.
- 저장 중 버튼 잠금, 입력 오류는 칸 아래 표시, 로딩·오류·빈 상태를 모두 만든다.
- 화면에 보이는 시각은 `lib/time.ts`(한국 시간, KST)를 거친다.
- 비밀 키·서비스 롤 키는 코드와 GitHub에 넣지 않는다.
