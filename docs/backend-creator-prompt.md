# 백엔드 세션에 붙여 넣을 지시문: 크리에이터·포트폴리오 저장 만들기 (2026-11-09)

`design` 가지에서 시작해. 이번 일은 **화면에 진짜 데이터가 저장되게 하는 백엔드**야. 화면(디자인)은 이미 시안대로 샘플로 만들어져 있고, 그 화면을 실제 로그인·DB에 잇는 게 목표야.

## 1. 먼저 읽을 것
- AGENTS.md (맨 위 Next.js 경고 포함: 코드 쓰기 전에 `node_modules/next/dist/docs/` 관련 안내 읽기), CLAUDE.md
- docs/creator-pages-plan.md 의 0-2, 0-4(D17~D34), 0-5, 0-6 전체, 2-7, 3-11
- docs/screen-contract.md, docs/handoff-creator-work.md
- docs/mockups/*.png 11장 (화면 모양 기준)
- 화면 쪽 코드: `components/creators/*`, `components/mypage/*`, `components/register/*`, `components/site-nav.tsx`, `components/planner/publish-profile.tsx`, `lib/creator-rules.ts`

## 2. 지금 상태 (사실)
- 로그인·마이페이지 기본 정보·기획안·협업 신청은 이미 서버에 연결돼 있다. 마이그레이션은 0001~0008(0008 = collab_replies)까지 있다. **새 파일은 0009부터**(계획 문서의 `0008_creators.sql` 표기는 번호가 겹쳐 틀렸다).
- 크리에이터 프로필, 작품, 작품 요소, 파일을 저장하는 표가 **없다.** `lib/creators.ts` 같은 읽기·저장 함수도 없다.
- 아래 화면은 전부 샘플 값으로만 움직이고 저장되지 않는다: 마이페이지 「크리에이터 등록」(`PublishProfile`)과 「포트폴리오 등록」 접은 목록(`components/mypage/portfolio-manage.tsx`), `/dev-preview/portfolio-register`, `/dev-preview/creators`(목록·프로필·작품 창), 상단 메뉴 종 알림(`SAMPLE_NOTICES`).
- `next.config.ts`에 design 가지 임시 줄이 있다(`/creators` → `/dev-preview/creators`). 실제 목록을 잇고 나서 지운다.

## 3. 만들 것 (순서대로, 단계마다 끝나면 멈추고 보고)
1. **DB 설계안 먼저 보고** (코드·SQL 쓰기 전에 별뜨리님 승인):
   - `creators`: 주인(auth 사용자 1명당 1개), 공개 주소 handle(영문 소문자·숫자·하이픈 3~20자, **한 번 정하면 못 바꿈**, 중복 불가), 역할(video/script/art_director/history_advisor/producer/other, 1개 이상), 소개 글(500자), 채널 링크(이름·주소, 5개까지), 협업 신청 받는 중 on/off, 공개/비공개, 대표 이미지 또는 영상(선택).
   - `creator_works`: 작품(제목, 로그라인, 장르 여러 개[`components/creators/genres.ts`], 역할 여러 개, 종류[로그라인·아웃라인·시리즈 바이블·파일럿·피치 문서·피치 영상·스토리 없는 이미지·영상], 분량[롱폼/숏폼], 공개 여부, 순서, 처음 공개한 시각).
   - `creator_work_blocks`: 작품 요소(영상[세부 종류·유튜브 주소 또는 파일], 로그라인, 문서[세부 종류·글·PDF], 이미지), 요소 순서. **맨 위 요소가 대표**(포트폴리오 카드에 보임). 로그라인은 작품마다 1개, 지울 수 없음.
   - 한도: 사람당 작품 12개, 파일 합계 20MB, 작품당 요소 20개. 서버(DB 규칙·함수)에서 세고 막는다.
   - RLS: 공개한 것만 누구나 읽고, 쓰기는 주인만. 주인 번호(UUID)는 화면·주소·응답에 내지 않는다. 이메일 확인 안 한 계정은 쓰기 금지(`is_email_confirmed()`).
2. **마이그레이션 파일** `supabase/migrations/0009_creators.sql` (여러 번 실행해도 안전, 기존 데이터 삭제 금지). **SQL은 실행하지 마라.** 별뜨리님이 Supabase SQL Editor에서 번호 순서대로 직접 실행한다. 실행 전 순서·되돌리는 법을 적어 줘.
3. **파일 보관**: 비공개 보관함 + 짧은 임시 주소로만 보여 주기. 이미지 5MB·영상 MP4 10MB·PDF 10MB. Vercel 요청 한도(4.5MB) 때문에 4MB 넘는 파일은 보관함에 **직접 올리는** 방식이 필요하다. 올릴 때 파일 앞 글자(시그니처)까지 서버가 검사한다(`lib/collab-file.ts` 참고).
4. **읽기·저장 함수**: `lib/creators.ts`(읽기), `app/actions/creators.ts`(프로필 저장, 작품 저장·삭제, 공개 스위치, 순서 저장, 요소 저장). **모든 Action 맨 위에서 로그인과 권한을 다시 확인**하고 로그인한 본인의 권한(RLS)으로 실행. 입력은 `lib/creator-rules.ts` 규칙으로 서버에서 다시 검사.
5. **종 알림**: 받은 협업 신청 중 새 것의 개수와 최근 목록을 서버에서 읽는 함수(`collab_requests`에서 받는 사람 기준).
6. **화면 잇기**: 샘플 값을 서버 값으로 바꾼다. 화면 모양·칸 이름은 바꾸지 마라. 바꿔야 하면 코드 전에 보고.
   - 마이페이지 크리에이터 등록·포트폴리오 목록, 포트폴리오 등록 화면(실제 주소 생성), `/creators`·`/creators/[handle]`·작품 창, 상단 메뉴 종·＋·사람 메뉴 링크.
   - 끝나면 `next.config.ts` 임시 줄 제거, 샘플 라우트(`/dev-preview/*`)와 `sample-data.ts` 삭제는 **지울 파일과 이유를 설명하고 허락받은 뒤에만.**

## 4. 지켜야 할 것
- 비밀번호·키·토큰을 코드·문서·GitHub에 넣지 마라. 환경 변수 추가, 새 패키지, 외부 서비스 연결, 비용 발생은 **승인 전에 하지 마라.**
- `proxy.ts`, `app/auth/callback`, 기존 마이그레이션 0001~0008, 다른 화면 디자인은 건드리지 마라.
- 화면에서 막았더라도 서버가 다시 확인한다(권한·한도·형식).
- 가짜 이메일·가짜 값으로만 시험한다. 실제 개인정보 받지 않는다.
- `main` 병합·푸시, 강제 푸시, 배포는 별뜨리님이 따로 시킬 때만. `design`에 커밋·푸시. 커밋 끝에 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## 5. 끝낼 때
- `npm run build`, `npm run lint` 실행. 개발 서버를 켜서 **로그인 → 프로필 저장 → 작품 등록 → 새로고침해도 남는지 → 다른 계정으로 봤을 때 공개한 것만 보이는지** 직접 확인한다. DB가 없어 확인하지 못한 것은 확인했다고 쓰지 마라.
- 바꾼 파일, 커밋 번호, 직접 확인한 것, 못 확인한 것, 남은 위험을 개발자가 아닌 사람에게 말하듯 쉽게 보고한다. 영어 오류는 한국어로 풀어서 설명한다.
