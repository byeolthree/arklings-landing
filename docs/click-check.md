# 미리보기 클릭 확인표 (dev 브랜치)

미리보기 주소: https://arklings-main-deploy-git-dev-chongaaa19-7825s-projects.vercel.app
(Vercel 로그인 보호가 걸려 있으면 Vercel에 로그인한 브라우저에서 여세요. 코드 기준: `5b3b416`)

## 먼저: 미리보기 DB가 어디까지 준비됐는지 (읽기만 하는 SQL)

Supabase SQL Editor에서 실행하면 어느 마이그레이션이 적용됐는지 보입니다. `false`인 줄의 번호부터 순서대로 실행해야 합니다.

```sql
select '0002 profiles' as 확인, to_regclass('public.profiles') is not null as 있음
union all select '0003 admins(받는 사람 규칙)', to_regclass('public.admins') is not null
union all select '0004 plans(기획안)', to_regclass('public.plans') is not null
union all select '0005 cleanup_runs', to_regclass('public.cleanup_runs') is not null
union all select '0006 pending_identity_links', to_regclass('public.pending_identity_links') is not null
union all select '0007 portfolio_items(보기)', to_regclass('public.portfolio_items') is not null;
```

제가 미리보기에서 직접 열어 본 결과: 협업 신청 화면은 작품 3개가 DB에서 읽혀 정상, `/portfolio`는 서버 오류 → **0007 미적용**. 0002~0006은 제가 DB를 볼 수 없어 확인하지 못했습니다.

## 모든 화면 공통: 상단 메뉴·하단

| 요소 | 로그인 전 | 로그인 후 |
|---|---|---|
| 로고 `Arklings` | `/` (랜딩) | `/` |
| 킹덤·스튜디오·크리에이터·라이브러리·커뮤니티 | 글자만(눌러도 이동 없음) | 같음 |
| 「로그인」(데스크톱 메뉴 오른쪽) | `/login?next=<지금 보던 주소>` | (없음) |
| 「받은 협업 신청」 | (없음) | `/collab` |
| 「마이페이지」 | (없음) | `/mypage` |
| 「로그아웃」 | (없음) | 로그아웃하고 `/` |
| 「지금 시작하기」 | `/planner` | `/planner` |
| 모바일 햄버거 메뉴 | 위와 같은 항목이 세로로 | 같음 |
| 하단 「개인정보처리방침」 | `/privacy` | `/privacy` |

## 화면별

| 화면 | 로그인 전 | 로그인 후 | DB 필요 |
|---|---|---|---|
| **랜딩 `/`** | 메뉴 오른쪽 글자 「로그인」→`/login`. 「지금 시작하기」(메뉴·본문 3곳·모바일 아래 고정 버튼)→`/planner`. 「협업 문의하기」(2곳)→`/collab/new` | 메뉴 글자가 「마이페이지」→`/mypage`. 나머지 같음 | 없음 (`/api/session`만 부름) |
| **`/login`** | 이메일·비밀번호 입력 → 성공하면 `/mypage`(또는 `next`). 틀리면 안내. 「비밀번호 설정·재설정」→`/forgot-password`. 「가입하기」→`/signup`. 구글·카카오(동의 체크 뒤) → 소셜 로그인 | 열면 바로 `/mypage`(또는 `next`)로 이동 | 로그인 자체는 Supabase 로그인만. 가입한 계정 필요 |
| **`/signup`** | 가입 → 「확인 메일을 보냈어요」 카드(「로그인하러 가기」→`/login`, 「다른 이메일로 다시 가입」→`/signup`). 메일 링크 → 로그인된 채 `/mypage` | 열면 `/mypage`로 이동 | 가입 시 프로필 자동 생성 = **0002** |
| **`/forgot-password`** | 이메일 입력 → 「메일을 보냈어요」 카드 →「로그인 화면으로」→`/login`. 메일 링크 → `/reset-password` | 같음(열 수 있음) | 없음(메일만) |
| **`/reset-password`** | `/auth/link-expired`로 이동(메일 링크로 와야 열림) | 새 비밀번호 저장 → `/mypage` 상단에 저장 안내 | 없음 |
| **`/auth/add-email`** | `/login`으로 이동 | 이메일 확인을 마친 계정은 `next`로 이동. 이메일 없는(카카오) 계정만 입력 화면 → 확인 메일 → 링크 누르면 `/mypage` | **0006**(이미 있는 이메일일 때) |
| **`/auth/link-social`** | `/login`으로 이동 | 요청이 없으면 `/mypage`. 요청이 있으면 「이어 주기」/「이어 주지 않기」 | **0006** |
| **`/auth/social-failed`** | 「로그인 화면으로 돌아가기」→`/login`, 「이메일로 가입하기」→`/signup` | 같음 | 없음 |
| **`/auth/link-expired`** | 「로그인하러 가기」→`/login`. 확인 메일 다시 받기 | 같음 | 없음 |
| **`/mypage`** | `/login?next=/mypage`로 이동 | 로그인 방법·내 이메일·공개 이름·내 기획안 목록(항목→`/planner?plan=번호`, 「새 기획안 쓰기」→`/planner`). 구글·카카오 연결/해제. 「로그아웃」→`/`. 「회원 탈퇴」→`/mypage/withdraw`. 이메일 확인 안 한 계정은 `/auth/add-email` | 프로필 **0002**, 기획안 목록 **0004** |
| **`/mypage/withdraw`** | `/login?next=...`로 이동 | 체크+「탈퇴합니다」 입력 → `/withdrawn`. 「그만두고 마이페이지로」→`/mypage` | **0002·0004**, 서버 전용 열쇠(미리보기에 설정됨) |
| **`/withdrawn`** | 「홈으로」→`/` | 같음 | 없음 |
| **`/planner`** | 쓰기·되돌리기 가능(이 기기에만 보관). 「임시저장」「PDF」「메일」 누르면 「저장하려면 로그인이 필요합니다」+「로그인」→`/login?next=/planner`, 「회원가입」→`/signup?next=/planner` | 「임시저장」→주소가 `?plan=번호`로 바뀌고 이력 생김. PDF 내려받기, 메일 받기(하루 3번), 「포트폴리오에 올리기」「내리기」, 이력 불러오기·고치기·삭제, 「기획안 통째로 삭제」→`/mypage`. 이메일 확인 안 한 계정은 `/auth/add-email` | 저장·이력·공개 **0004**. 메일은 미리보기에 설정된 SMTP 값 필요 |
| **`/planner?plan=번호`** | `/login?next=...`로 이동 | 내 기획안이면 열림, 남의 것·없는 번호는 404 | **0004** |
| **`/portfolio`** | 공개된 기획안 목록(카드→`/portfolio/번호`), 비어 있으면 안내+「지금 시작하기」→`/planner`. 10개씩 이전/다음 | 같음 | **0007**(+0004). 지금 미리보기에서 **오류** |
| **`/portfolio/번호`** | 「← 포트폴리오」→`/portfolio`. 「협업 신청」→`/collab/new?plan=번호`. 비공개·삭제·없는 번호는 「찾을 수 없는 기획안이에요」(404) | 같음 | **0007**. 지금 미리보기에서 **오류** |
| **`/collab/new`** | 누구나 신청. 「신청서 보내기」→`/collab/done`. 「취소」→`/` | 같음 | 작품 목록=기본 표(미리보기에서 확인됨). 저장하려면 받는 사람 칸 **0003**, 기획안으로 신청은 **0007** |
| **`/collab/new?plan=번호`** | 공개 중인 기획안이면 「○○님께 전달됩니다」+신청 폼, 취소→`/portfolio/번호`. 아니면 「신청할 수 없는 기획안이에요」+「포트폴리오 둘러보기」 | 같음 | **0007** |
| **`/collab/done`** | 접수 안내. 「홈으로」→`/` | 같음 | 없음 |
| **`/collab`** | `/login?next=/collab`로 이동 | 내게 온 신청 목록(운영자 표시가 있으면 아클링스 앞 신청도). 항목→`/collab/번호`, 상태 필터 | **0003**(+0007) |
| **`/collab/번호`**, **`/collab/번호/edit`** | `/login`으로 이동 | 받는 사람 본인만 열림, 아니면 404. 「수정」→`/edit`, 「← 목록으로」→`/collab`, 삭제→`/collab?deleted=1` | **0003** |
| **`/privacy`** | 처리방침 | 같음 | 없음 |
| 옛 주소 | `/planner.html`→`/planner`, `/apply`→`/collab/new`, `/collab/gate`→`/login?next=/collab` | 같음 | 없음 |

## 미리보기에서 안 되는 것 (DB·설정이 없어서)

| 항목 | 이유 | 해결 |
|---|---|---|
| `/portfolio`, `/portfolio/번호`, 기획안으로 협업 신청 | 보기 `portfolio_items`가 없음(**0007 미적용**) | `0007_portfolio.sql` 실행 (`0004`·`0006` 다음) |
| 가입·로그인 후 화면 전체(마이페이지·기획안·탈퇴) | 위 SQL 확인표에서 `false`가 나온 번호가 있으면 해당 화면이 오류 | 0002~0006을 번호 순서대로 실행 |
| 이메일 확인 링크·비밀번호 설정 링크·소셜 로그인 | Supabase **Redirect URLs**에 미리보기 주소(`https://arklings-main-deploy-git-dev-chongaaa19-7825s-projects.vercel.app/**`)가 없으면 링크가 다른 주소로 감 | Supabase → Authentication → URL Configuration에 추가 |
| 구글·카카오 계정 이어주기·방법 추가/해제 | Supabase의 「수동 연결 허용」이 꺼져 있으면 「준비 중」 안내 | 설정 켜기(`supabase/social-setup.md`) |
| 가입·재설정 메일 도착 | Supabase 자체 메일 설정(SMTP)과 이메일 템플릿 3·4번이 필요(미리보기가 아니라 Supabase 쪽) | `supabase/email-templates.md` |
| `/api/cron/cleanup`(정기 삭제) | 미리보기에는 `CRON_SECRET`이 없고 예약 작업은 배포(production)에서만 돔 → 미리보기에서는 항상 401 | 정상 동작임 |
