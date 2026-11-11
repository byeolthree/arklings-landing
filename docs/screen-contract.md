# 화면 계약표 (디자인 새로 만들기용)

작성: 2026-10-31, `design` 가지(`dev` 9653145 → e090abb 기준). 백엔드는 그대로 둔다.

## 지키는 규칙

- 새 화면은 아래 표의 **부르는 처리 함수 / 입력 칸 이름 / 화면에 받는 데이터 / 이동 주소**를 그대로 지킨다. 바꿔야 할 것이 생기면 먼저 보고한다. 표에 없는 화면은 줄을 더해 승인을 받은 뒤에 만든다.
- `/dev-preview`와 샘플 데이터는 실제 사이트 메뉴·이동 규칙에 연결하지 않는다. 자세한 경계는 `AGENTS.md` 「화면·기능을 덧붙일 때」.
- 건드리지 않는 곳: `app/actions`, `lib`, `supabase`, `proxy.ts`, `app/api`, `app/auth/callback`.
- 입력 칸의 `name`, 숨은 칸(`next`, `provider`, `plan_id`, `extra_note`), 처리 함수에 넘기는 모양(FormData 또는 draft)을 바꾸지 않는다.
- 화면에서 막았더라도 서버가 다시 확인한다. 디자인은 이 확인을 대신하거나 빼지 않는다.
- 이 표는 코드를 읽고 쓴 것이다. 화면을 직접 눌러 확인한 것이 아니다.

## 공통 부품 (모든 화면이 쓰는 것)

| 부품 | 파일 | 하는 일 | 계약 |
|---|---|---|---|
| 상단 메뉴 (2026-11-11 별뜨리님 지시로 고침) | `components/site-nav.tsx`(서버에서 `components/site-header.tsx`가 값을 읽어 넘김) | 로고(햄버거는 로고 왼쪽), 메뉴, 오른쪽 아이콘 ＋·사람·종. **마우스를 올리면 드롭다운이 열리고 벗어나면 닫힌다**(터치 화면은 누르면 열고 닫음). 로그인: ＋=크리에이터→`/portfolio/new`(「등록할 곳」 문구 없음), 사람=기본 정보 `/mypage`·프로필 등록 `/portfolio/new?step=profile`·포트폴리오 등록 `/portfolio/new`·협업 신청 `/mypage/collab`·**운영자 `/admin`(운영자 표시 계정에만)**·로그아웃 `signOut()`, 종=새 협업 신청(「접수」 상태) 개수(`countNewCollab`)와 최근 5건(`listNewCollab`, 한 줄을 누르면 `/collab/<id>`)·「받은 협업 신청 모두 보기」 `/collab`. **로그아웃: ＋는 보이지 않고** 사람만(로그인 `/login`·회원가입 `/signup`) | `loggedIn`(`getCurrentUser()`), `newCount`, `notices[]`(`id`,`text`,`when`), `isAdmin`(`isAdminUser()`) |
| 하단 | `components/site-footer.tsx` | 「개인정보처리방침」→`/privacy` | 없음 |
| 입력칸 틀 | `components/form-field.tsx` | `FormField`(id, label, hint, error), `authInputCls` | 없음 |
| 카드 틀 | `components/paper-card.tsx` | `PaperPage`, `PaperCard`, `CardHeading`, `primaryBtn`, `outlineBtn` | 없음 |
| 소셜 버튼 | `components/social-buttons.tsx` | 구글·카카오(동의 체크 뒤) | `startOAuth`, 칸 `next`, `consent`, `provider` |
| 상태 배지 | `components/status-badge.tsx` | 협업 신청 상태 표시 | `Status` 값 |

로그인 상태 읽기(서버): `getCurrentUser()` → `{ id, email, emailConfirmed, providers[] } | null`, `requireUser(returnPath)`(로그인 안 했으면 `/login?next=`로 이동, 이메일이 없거나 확인 전이면 `/auth/add-email?next=`로 이동). 표의 「로그인 필요: 예」 화면은 모두 이 규칙을 따른다.

## 처리 함수의 결과 모양

- `AuthFormState`(로그인·가입 계열): `errors`(칸별 `displayName`/`email`/`password`/`passwordConfirm`/`consent`), `message`, `nextStep`, `values`(`displayName`,`email`), `sentTo`, `resent`, `returnTo`, `needsConfirm`, `saved`
- `FormState`(협업 신청): `errors`(칸 이름별), `message`, `values`(칸 이름별 글자)
- `WithdrawState`: `error`
- 기획안 동작: `{ ok: true, ...값 } | { ok: false, error, needLogin? }`

## 인증·계정 화면

| 화면 | 주소 | 로그인 필요 | 지금 DB | 부르는 처리 함수 | 입력 칸 이름 | 화면에 받는 데이터 | 이동 |
|---|---|---|---|---|---|---|---|
| 로그인 | `/login?next=` | 아니요 (로그인돼 있으면 `next`로) | 열림 | `signIn`, 소셜은 `startOAuth` | `next`(숨김), `email`, `password` / 소셜: `next`(숨김), `consent`(체크), `provider`(버튼 값 google·kakao) | `returnTo`(= `safeNext(next)`), `AuthFormState`(`errors`,`message`,`values.email`,`returnTo`,`nextStep`=retry·resend·signup·later,`needsConfirm`). `needsConfirm`이 있으면 확인 메일 다시 받기 상자(`resendConfirmation`). 메시지가 있으면 「구글·카카오로 가입했거나…」 안내와 `/forgot-password?email=<입력한 이메일>` 링크 | 성공하면 `returnTo`로, 가입 `/signup?next=<returnTo>`, 비밀번호 `/forgot-password` |
| 가입 | `/signup?next=` | 아니요 (로그인돼 있으면 `next`로) | 열림(0002) | `signUp`, 소셜은 `startOAuth` | `next`(숨김), `displayName`, `email`, `password`, `passwordConfirm`, `consent` | `returnTo`, `AuthFormState`(`errors`(칸별),`message`,`nextStep`,`values`(`displayName`,`email`)). 성공하면 이동하지 않고 `sentTo`가 와서 「확인 메일을 보냈어요」 카드(`CheckEmailCard`: `email`,`returnTo`) | 카드의 「로그인하러 가기」 `/login?next=`, 「다른 이메일로 다시 가입하기」 `/signup?next=` |
| 확인 메일 다시 받기 | 로그인·링크 만료 화면 안 | 아니요 | 열림 | `resendConfirmation` | `next`(숨김), `email`(주소를 묻는 경우 입력, 아니면 숨김) | `AuthFormState`(`message`,`sentTo`,`resent`) | - |
| 비밀번호 설정·재설정 | `/forgot-password?email=` | 아니요 | 열림 | `requestPasswordReset` | `email` | `initialEmail`(주소의 `email`, 254자까지), `AuthFormState`(`errors.email`,`message`,`nextStep`,`values.email`,`sentTo`). 보냈으면 `sentTo`가 온다 | 로그인 `/login` |
| 새 비밀번호 | `/reset-password` | 메일 링크로 들어온 로그인 상태 (아니면 `/auth/link-expired?next=/reset-password`) | 열림 | `updatePassword` | `password`, `passwordConfirm` | `AuthFormState`(`errors.password`,`errors.passwordConfirm`,`message`,`nextStep`). `saved`는 없다 | 성공하면 `/mypage?msg=password_set` |
| 이메일 추가 | `/auth/add-email?next=` | 예 (로그인 안 했으면 `/login?next=`, 이미 확인된 계정이면 `next`로) | 이메일 입력·확인은 열림, **이미 쓰는 이메일**은 0006 필요 | `requestEmail` | `next`(숨김), `email` (한 번 더 보내기 폼은 `email`도 숨김) | `returnTo`, `providerLabel`(로그인에 쓴 소셜 이름, 없으면 「소셜」), `AuthFormState`(`errors.email`,`message`,`nextStep`,`values.email`,`sentTo`,`returnTo`). 이미 확인된 계정이 보내면 `returnTo`로 이동 | - |
| 계정 이어주기 | `/auth/link-social` | 예 (로그인 안 했으면 `/login?next=/auth/link-social`, 이메일 없는 계정·요청 없음은 `/mypage`로) | **안 됨**(0006 + 수동 연결 꺼짐) | `finishSocialLink`(이어 주기), `dismissSocialLink`(이어 주지 않기) | 입력 칸 없음(버튼 둘, 폼 둘) | `user.email`, `pending`(`provider`→`PROVIDER_LABEL`로 소셜 이름, `createdAt`→`formatKst`로 요청 시각, `sourceUserId`→`profiles.display_name`으로 요청한 계정 이름, 없으면 「(이름 없음)」) | 「나중에 하기」 `/mypage` |
| 소셜 로그인 실패 | `/auth/social-failed?reason=&next=` | 아니요 | 열림 | 없음 | 없음 | `reason`(안내 문구 고르기: `cancelled`·`linked_elsewhere`·`expired`·`failed`, 모르는 값은 `failed`), `next` | 로그인 `/login?next=`, 가입 `/signup?next=` |
| 확인 링크 만료 | `/auth/link-expired?next=` | 아니요 | 열림 | `resendConfirmation`(상자 안) | `next`(숨김), `email` | `next` | 로그인 `/login?next=` |

## 마이페이지·탈퇴

| 화면 | 주소 | 로그인 필요 | 지금 DB | 부르는 처리 함수 | 입력 칸 이름 | 화면에 받는 데이터 | 이동 |
|---|---|---|---|---|---|---|---|
| 마이페이지 | `/mypage?msg=` | 예 | 위쪽 열림(0002), **내 기획안 목록은 안 됨**(0004) | `updateDisplayName`, `signOut`, `startLinkIdentity`, `unlinkProvider` | 공개 이름: `displayName` / 연결·해제: `provider`(숨김 값) / 로그아웃: 칸 없음 | `user`(`email`,`providers`), 로그인 방법 이름 `PROVIDER_LABEL`, 더할 수 있는 방법 `OAUTH_PROVIDERS`(없는 것만), `profiles.display_name`(`profileLoadFailed`면 오류 안내), `plans`(`id`,`title`,`is_public`,`updated_at` 최근 30건, `formatKst`. 못 읽으면 `plansLoadFailed` 안내, 없으면 「아직 저장한 기획안이 없어요」), `msg` 안내 키(`linked`,`unlinked`,`password_set`,`link_failed`,`link_disabled`,`link_none`,`unlink_failed`,`unlink_last`, 문구는 `app/mypage/page.tsx`의 `MESSAGES`). `updateDisplayName` 결과는 `errors.displayName`,`message`,`values.displayName`,`saved` | 기획안 `/planner?plan=<id>`, 새 기획안 `/planner`, 이메일 로그인 추가 `/forgot-password?email=`(이메일 방법이 없을 때), 탈퇴 `/mypage/withdraw`. 연결/해제는 안 됨(수동 연결 꺼짐) |
| 회원 탈퇴 | `/mypage/withdraw` | 예 | 화면 열림, **탈퇴 실행은 안 됨**(0003) | `withdrawAccount` | `agree`(체크), `phrase`(「탈퇴합니다」 입력) | `WithdrawState.error` | 그만두기 `/mypage`, 성공하면 `/withdrawn` |
| 탈퇴 완료 | `/withdrawn` | 아니요 | 열림 | 없음 | 없음 | 없음 | 「홈으로」`/` |

## 기획안

| 화면 | 주소 | 로그인 필요 | 지금 DB | 부르는 처리 함수 | 입력 칸 이름 | 화면에 받는 데이터 | 이동 |
|---|---|---|---|---|---|---|---|
| 기획안 | `/planner`, `/planner?plan=<id>` | 쓰기는 아니요(이 기기 브라우저 `localStorage`에 자동 보관), 서버 저장·PDF·메일은 예. 로그인 안 하고 `?plan=`이면 `/login?next=`로 이동 | 쓰기·PDF 열림, **저장·이력·공개·메일은 안 됨**(0004) | `savePlan(planId, draft)`, `getRevision(planId, revisionId)`, `updateRevision(planId, revisionId, draft)`, `deleteRevision(planId, revisionId)`, `deletePlan(planId)`, `setPlanPublic(planId, makePublic, draft)`, `downloadPlanPdf(draft)`, `mailPlanPdf(draft)` | 폼이 아니라 `draft` 객체(`PlanDraft`: `title`, `slots[]`, `checks`, `edited`). 질문·검사 문구는 `components/planner/questions.ts` | `PlannerEditor` props: `loggedIn`, `displayName`(`profiles.display_name`, 못 읽으면 빈 글자), `panel`(`PlanPanel`: `plan{id,isPublic,publishedAt}`, `revisions[{id,createdAt,preview,edited}]`, `latest`). 로그인 안 하면 `loggedIn=false`, `panel=null`. 내 기획안이 아니거나 없는 번호는 404. 처리 함수는 `{ok:true,…}`/`{ok:false,error,needLogin?}`를 돌려줌 | 로그인 `/login?next=/planner`, 가입 `/signup?next=/planner`, 기획안 삭제 뒤 `/mypage`. 이메일이 없거나 확인 전이면 `/auth/add-email?next=`로 이동 |

**기획안 화면 구조 변경 (2026-11-07, 별뜨리님 지시)** — 처리 함수 이름·인자·반환 모양은 그대로이고, 화면 쪽만 이렇게 바뀐다.
- 「임시저장」이라는 말을 없애고 단추·안내·이력 이름을 「저장」으로 쓴다(`savePlan` 이름은 그대로). 서버 오류 문구(`app/actions/plans.ts`의 「임시저장은 … 100건까지」)는 서버 파일이라 별뜨리님 승인 전에는 그대로 둔다.
- 세 단계: **01 로그라인**(쓰기·「저장」·「저장 이력」은 이 단계 위쪽), **02 모아 보기**(저장한 내용 보기, 「PDF 내려받기」「메일로 받기」, 「포트폴리오 작성하기」), **03 편집**(내용이 정해지기 전까지 탭만 있고 눌리지 않음). 「저장」을 누르면 02로 넘어간다. PDF·메일·올리기는 01에서 없앤다.
- 로그인 여부는 화면이 열릴 때의 `loggedIn` 값으로 먼저 막지 않는다. 저장·PDF·메일은 항상 처리 함수를 부르고, 결과가 `needLogin`일 때만 안내를 띄운다. 성공하면 화면의 로그인 상태를 맞춘다. 로그인하지 않은 채로 「저장」을 누르면 이 브라우저(`localStorage`)에만 저장하고 「로그인하지 않아 이 브라우저에만 임시로 저장돼요」를 띄운 뒤 02로 넘어간다.
- `PlannerEditor` props 추가: `initialStep`(1 또는 2, 주소 `?step=`; 기획안 번호가 없거나 내 기획안이 아니면 1). 02 주소는 `/planner?plan=<id>&step=2`.
- 7번(제안 문장): 「아클링스 제안 문장으로 되돌리기」「제안 문장을 가져와서 고치기」 두 단추를 없애고, 글칸 아래에 「제안 문장」 카드와 「이 문장으로 바꾸기」(바꾸기 전 글은 되돌리기·「바꾸기 전 내 글 되살리기」로 남음)를 둔다. 평가(LLM 호출) 자리는 코드에 주석으로만 비워 두고 화면에는 단추를 두지 않는다.

기획안 화면은 한 부품(`planner-editor.tsx`)이 처리 함수를 직접 부른다. 디자인을 새로 만들 때도 이 호출 모양(인자 순서, 반환값)을 그대로 쓴다. `useUndo`(`use-undo.ts`)와 `localStorage` 키(`arklings-planner-draft…`)도 유지한다.

## 포트폴리오

| 화면 | 주소 | 로그인 필요 | 지금 DB | 부르는 처리 함수 | 입력 칸 이름 | 화면에 받는 데이터 | 이동 |
|---|---|---|---|---|---|---|---|
| 포트폴리오 목록 | `/portfolio?page=` | 아니요 | **안 됨**(0007, 서버 오류) | 없음(읽기만: `listPortfolio(page)`) | 없음 | `cards[]`(`PortfolioCard`: `id`, `title`, `logline`, `authorName`, `publishedAt`), `total`, 쪽 수(`PORTFOLIO_PAGE_SIZE`=10으로 계산). 시각은 `formatKstDate`(「게시일」). 세 가지 상태: 하나도 없음(`total=0`), 쪽 번호가 너무 큼(`cards`가 비고 `total>0`: 「이 쪽에는 기획안이 없어요」), 목록 | 카드 `/portfolio/<id>`, 비었을 때 「기획안 만들기」 `/planner`, 너무 큰 쪽 「첫 쪽으로」 `/portfolio`, 이전·다음 `/portfolio?page=<n>`(1쪽은 `/portfolio`) |
| 포트폴리오 상세 | `/portfolio/<id>` | 아니요 | **안 됨**(0007) | 없음(읽기만: `getPortfolio(id)`) | 없음 | `PortfolioDetail`(위 카드 값 + `content`: `sections[{id,label,text}]`, `answers[{label,text}]`). 없는 번호·비공개·UUID가 아닌 값은 404(`app/portfolio/not-found.tsx`) | 「← 포트폴리오」`/portfolio`, 「이 기획안에 협업 신청」 `/collab/new?plan=<id>`, 링크 복사(`CopyLinkButton`) |

작성자 주인 번호는 화면·주소·화면 소스 어디에도 내지 않는다.

## 협업 신청

| 화면 | 주소 | 로그인 필요 | 지금 DB | 부르는 처리 함수 | 입력 칸 이름 | 화면에 받는 데이터 | 이동 |
|---|---|---|---|---|---|---|---|
| 협업 신청 | `/collab/new` | 아니요 | 폼 열림, **보내기는 안 됨**(0003) | `createCollab` | `extra_note`(숨은 봇 방지 칸, 비워 둠), `applicant_name`, `contact`, `sns_handle`, `source_work_id`(선택), `roles`(체크, 여러 개: video·script·art_director·history_advisor·producer·other), `idea`, `portfolio_url`, `attachment`(파일 pdf/jpg/png 4MB), `consent`(체크) | `CollabForm` props: `action=createCollab`, `works[]`(`source_works`의 `id`,`title`), `cancelHref="/"`. `FormState`(`errors`(칸 이름별),`message`,`values`(칸 이름별 글자, `roles`는 쉼표로 이은 한 글자)) | 성공하면 `/collab/done`(`extra_note`에 글자가 있어도 `/collab/done`), 취소 `/` |
| 기획안으로 협업 신청 | `/collab/new?plan=<id>` | 아니요 | **안 됨**(0007) | `createCollab` | 위와 같음 + `plan_id`(숨김). **작품 고르는 칸(`source_work_id`) 대신** 기획안 제목과 「○○님께 전달됩니다」 | `CollabForm` props: `action=createCollab`, `works=[]`, `cancelHref="/portfolio/<id>"`, `plan={id,title,recipientName}`(`getPortfolio(id)`의 `id`,`title`,`authorName`). `?plan=`이 있는데 UUID가 아니거나 공개가 아니면 「신청할 수 없는 기획안이에요」 | 취소 `/portfolio/<id>`, 안내 화면의 「포트폴리오 둘러보기」 `/portfolio` |
| 접수 안내 | `/collab/done` | 아니요 | 열림 | 없음 | 없음 | 없음 | 「홈으로」`/` |
| 받은 협업 신청 목록 | `/collab?status=&page=&deleted=` | 예 | **안 됨**(0003) | 없음(읽기만) | 없음(상태 필터는 주소 값) | `collab_requests`(`CollabRequest` 전체 + `source_works.title`, `plans.title`)의 `rows`, `total`, 쪽 수(`PAGE_SIZE`=10). 항목에 보이는 것: `applicant_name`, 기획안 제목 또는 작품 제목(없으면 「전체 협업 제안」), `roles`, `status`(`StatusBadge`). `deleted`가 있으면 「삭제되었습니다.」 | 항목 `/collab/<id>`, 필터 `/collab?status=<상태>`, 이전·다음 `/collab?…page=<n>` |
| 받은 신청 상세 | `/collab/<id>?saved=updated` | 예 | **안 됨**(0003) | `deleteCollab(id)`(삭제 버튼) | 칸 없음(삭제 확인) | `CollabRequest` 전체, 첨부 5분짜리 임시 주소(서버가 만든 `fileUrl`), `ROLES`, `STATUSES`, `saved`(`updated`면 「수정 내용이 저장되었습니다.」). 받는 사람이 아니면 404 | 「← 목록으로」`/collab`, 「수정」`/collab/<id>/edit`, 삭제하면 `/collab?deleted=1` |
| 받은 신청 수정 | `/collab/<id>/edit` | 예 | **안 됨**(0003) | `updateCollab(id, …)` | 신청 폼과 같음 + `status`(선택), `remove_attachment`(체크). `plan_id`·`extra_note`는 없음 | `CollabForm` props: `action=updateCollab.bind(null, id)`, `works[]`, `initial`(`CollabRequest`), `cancelHref="/collab/<id>"`, `FormState`. 받는 사람이 아니거나 없는 번호는 404 | 취소 `/collab/<id>`, 성공하면 `/collab/<id>?saved=updated` |

## 그 밖의 화면·길

| 화면 | 주소 | 로그인 필요 | 부르는 처리 함수 | 받는 데이터 / 비고 |
|---|---|---|---|---|
| 개인정보처리방침 | `/privacy` | 아니요 | 없음 | `CONSENT_ITEMS`, `CONSENT_NOTES`, `CONSENT_PLACEHOLDERS`(`lib/consent.ts`). 가입·협업 신청의 동의 문구와 같은 글 |
| 옛 주소 | `/planner.html`, `/apply`, `/collab/gate` | - | 없음 | `next.config.ts`·`app/collab/gate`가 이동시킴 |
| 로그인 상태 확인 | `/api/session` | - | 없음(읽기만) | 랜딩(`public/landing.html`)만 부른다. 로그인한 본인에게만 `loggedIn`, `isAdmin`, `newCount`, `notices[]`(`id`,`text`,`when`; 글은 `lib/nav-notices.ts` 한 곳)를 주고, 로그아웃이면 `{loggedIn:false}`만 준다 |
| 홈 상단 아이콘 (2026-11-11 별뜨리님 지시) | `public/landing.html` | 로그인: ＋·사람·종 모두 마우스를 올리면 드롭다운(＋=크리에이터, 사람=상단 메뉴와 같은 항목+로그아웃, 종=알림 목록). 상단 「기획안 만들기」 버튼은 숨김. 로그아웃: ＋·종·알림 없음, 사람=로그인·회원가입, 「기획안 만들기」 보임 | 없음 | 로그아웃은 `POST /auth/signout`(`app/auth/signout/route.ts`, 같은 사이트에서 온 요청만 처리하고 이 기기만 로그아웃한 뒤 `/`로) | 위 상태 확인 값 | `/api/session` |
| 정리 작업 | `/api/cron/cleanup` | 비밀값 | 없음 | 화면 없음 |
| 인증 돌아오는 길 | `/auth/callback`, `/auth/confirm` | - | 없음 | 화면 없음. 만지지 않는다 |

## 크리에이터 (2026-11-07 줄 추가·5·6단계 반영, `dev` ebde7b4 기준 · DB는 0009 실행 완료)

읽기는 `lib/creators.ts` 한 곳이고 DB의 공개용 보기 4개(`creators_public`, `creator_channels_public`, `creator_works_public`, `creator_blocks_public`)에서만 읽는다. 주인 번호·이메일은 화면·주소·화면 소스 어디에도 내지 않는다. 파일(이미지·PDF)은 비공개 보관함 `creator-works`에 있고 보여 줄 때만 짧은 임시 주소(10분)를 만든다. 쓰기는 모두 `app/actions/creators.ts`의 Server Action이며 맨 위에서 로그인·이메일 확인을 다시 하고, 로그인한 본인 연결(`createAuthClient`)과 RLS로 실행한다. 글자 수·개수 규칙은 `lib/creator-rules.ts` 한 곳.

| 화면 | 주소 | 로그인 필요 | 부르는 처리 함수 | 입력 칸 / 인자 | 화면에 받는 데이터 | 이동 |
|---|---|---|---|---|---|---|
| 크리에이터 목록 | `/creators?q=&role=&genre=&form=&open=&page=` | 아니요 | 없음(읽기만: `listCreators(filter, page)`) | 주소 값 `q`(30자), `role`(역할 하나), `genre`(장르 하나), `form`(long·short), `open`(1), `page` | `cards[]`(`CreatorCard`와 같은 값: `handle`, `name`, `roles`, `bio`(앞부분), `planCount`(공개 작품 수), `openToCollab`, `genres`, `forms`, `latest`(없을 수 있음), `hero`, `heroSrc`(임시 주소)), `total`, 쪽 수(`CREATOR_PAGE_SIZE`). 공개 프로필만, 공개한 작품이 1건 이상인 크리에이터만 나온다(별뜨리님 결정 2026-11-07, 프로필만으로는 등록되지 않음) | 카드 `/creators/<handle>`, 협업 신청 `/collab/new?creator=<handle>`(0010 뒤에 열림), 비었을 때 「기획안 만들기」 `/planner`·「크리에이터 프로필 만들기」 `/mypage` |
| 크리에이터 프로필 | `/creators/<handle>` (작품 창: `?work=<작품 번호>`) | 아니요 (본인은 비공개도 봄) | 없음(읽기만: `getCreator(handle)`, `listCreatorWorks(handle)`, `getWork(id)`) | 없음 | 프로필(`handle`, `name`, `roles`, `bio`, `channels[]`, `openToCollab`, `hero`·`heroSrc`), 작품 카드 `WorkCard[]`(`id`, `title`, `logline`, `roles`, `genres`, `kind`, `form`, `publishedAt`), 작품 상세(`WorkDetailData`: 위 값 + 순서대로 `blocks[]` 글·이미지·영상·문서, 파일은 임시 주소). 공개가 아니고 본인도 아니면 404. 본인이 비공개 프로필을 열면 「비공개 상태입니다」 표시와 협업 신청 버튼 숨김(D13) | 작품 창 닫기 `/creators/<handle>`, 「이 작품에 협업 신청」·「이 크리에이터에게 협업 신청」은 0010 뒤에 `/collab/new?…` |
| 작품 공유 주소 | `/portfolio/<작품 번호>` | 아니요 | 없음(읽기만: `getWork(id)`) | 없음 | 위 작품 상세. 공개가 아니면 404 | 「프로필 보기」 `/creators/<handle>` (D29) |
| 마이페이지 · 크리에이터 등록 구역 | `/mypage` 안 | 예 | `saveCreatorProfile`, `setProfilePublic`, `checkHandle` | `handle`, `roles`(여러 개), `bio`(소개 글 500자, 선택), `channels`(이름 20자·https 주소, 5개까지), `openToCollab`, `isPublic` | 내 프로필·채널(로그인한 본인 연결로 읽음). 결과 `{ok:true, created, handle}` / `{ok:false, error, fieldErrors?}` | 내 프로필 주소 `/creators/<handle>` |
| 마이페이지 · 포트폴리오 등록 구역 | `/mypage` 안 | 예 | `createWork`, `updateWork`, `deleteWork`, `setWorkPublic`, `addTextBlock`, `updateTextBlock`, `addVideoBlock`, `prepareFileUpload`→(브라우저가 보관함에 직접 올림)→`finishFileUpload`, `moveBlock`, `reorderBlocks`, `deleteBlock` | 작품: `title`(60자), `roles`, `genres`, `kind`, `form`, `logline`(띄어쓰기 뺀 200자), `planId`. 요소: 글 5000자, 유튜브 주소, 이미지 JPG·PNG·WEBP 5MB, PDF 10MB, 사람당 합계 20MB, 작품 12개, 작품당 요소 20개 | 내 작품·요소(본인 연결로 읽음), 용량·개수 | 작품 창은 위와 같음 |
| 기획안 화면 · 포트폴리오 작성하기 | `/planner?plan=<id>&step=2` | 예 | `startWorkFromPlan(planId, draft)`(2026-11-07 별뜨리님 지시: 기획안 화면에서 바로 올리지 않는다. 그 기획안이 붙은 작품을 비공개로 만들고(제목·로그라인은 기획안에서, 역할은 「대본」을 먼저 골라 둠) 마이페이지 포트폴리오 등록으로 넘어가 마저 쓴 뒤 거기서 올린다. 이미 있으면 그 작품 번호만 돌려줌. 프로필이 없으면 `needProfile`) | 없음(입력은 마이페이지에서) | `PlannerEditor` props `workId`, `workPublic`(이전의 `creatorProfile`은 없앰) | 「포트폴리오 작성하기」→`/mypage?work=<작품 번호>#mp-portfolio`(그 작품 편집 칸이 열림), 프로필이 없으면 `/mypage?msg=need_profile#mp-creator`, 올라가 있으면 「포트폴리오에서 보기」 `/portfolio/<작품 번호>`. 이전의 `publishPlanAsWork`·`unpublishPlanWork`는 없앰(내리기는 마이페이지 작품에서) |
| 옛 포트폴리오 목록 | `/portfolio` | 아니요 | 없음 | 없음 | 없음 | `/creators`로 이동(D29로 작품 단위가 됨) |

| 독립 포트폴리오 등록(시안 01) | `/portfolio/new?work=<작품 번호>` | 예 (이메일 확인까지) | `saveCreatorProfile`·`checkHandle`(프로필이 없을 때만 「프로필 등록」 단계), `createWork`·`updateWork`·`deleteWork`·`setWorkPublic`, 요소 동작은 마이페이지와 같음 | 마이페이지 「포트폴리오 등록」과 같은 칸 | 내 프로필·작품·용량(`loadMyCreator`), 닉네임. 오른쪽 「포트폴리오 화면에 보일 카드」는 편집 칸 값(제목·로그라인·장르·역할·맨 위 이미지/영상)으로 바로 바뀐다 | 단계 칩 「프로필 등록」→`/mypage#mp-creator` |
| 마이페이지 = 기본 정보 화면(시안 12, D39·D42) | `/mypage` | 예 | 기존 처리 그대로: `updateDisplayName`(`displayName`)·`startLinkIdentity`·`unlinkProvider`·`signOut` | 닉네임, 로그인 방법, 이메일 | 맨 위 띠의 제목은 「마이페이지」, 칩 네 개(기본 정보·프로필 등록·포트폴리오 등록·협업 신청)가 각각 `/mypage`·`/portfolio/new?step=profile`·`/portfolio/new`·`/mypage/collab`으로 이어진다. 이 화면에는 기본 정보 카드만 있다 |
| 협업 신청 화면(시안 13, D39) | `/mypage/collab` | 예 | 새 처리 함수 없음. 로그인한 본인 권한(RLS)으로 `collab_requests`를 읽는다(받은 신청 최근 10건, 보낸 신청 20건) | 신청자 이름, 대상(`collabTargetOf`), 역할, 접수일, 상태, 답장 | 받은 줄의 「열기」→`/collab/<번호>`, 「전체 보기」→`/collab`. 상태 태그는 `components/status-badge.tsx` 한 곳의 색(D40·D41). 상단 메뉴 사람 아이콘에 「협업 신청」 항목(→이 화면) |
| 보낸 협업 신청 상세(별뜨리님 추가 지시, 2026-11-10) | `/mypage/collab/<신청 번호>` | 예 (이메일 확인까지) | 새 처리 함수 없음. 보기만(수정·삭제·상태 바꾸기·답장 칸 없음). 로그인한 본인 연결(`createAuthClient`)로 `collab_requests`를 `applicant_id = 내 번호`로 읽는다(RLS가 한 번 더 막음). 남의 신청·없는 번호·번호 모양이 아님 → 404 | 신청 대상(`collabTargetOf`), 역할, 아이디어, 작업 링크, 첨부 **파일 이름만**(내려받기 링크 없음), 신청일, 상태 태그, 받은 답장(`collab_replies`: 날짜·수락/거절·글) | 협업 신청 화면 「보낸 협업 신청」 줄의 「열기」로 온다. 「← 협업 신청」은 `/mypage/collab` |
| 등록 단계 칩 연결 + 프로필 등록 화면(시안 01 B, 2026-11-09 별뜨리님 지시) | `/portfolio/new?step=profile` (이미 프로필이 있어도 열린다) | 예 (이메일 확인까지) | 새 처리 함수 없음. 기존 `saveCreatorProfile`·`checkHandle`·대표 파일 올리기(`prepareHeroUpload`·`finishHeroUpload`·`removeHero`)를 그대로 쓴다 | 위와 같음(프로필 칸 이름 그대로) | 단계 칩은 모두 누를 수 있다: 로그인·가입·이메일 확인 → `/mypage#mp-basic`, 프로필 등록 → `/portfolio/new?step=profile`, 포트폴리오 등록 → `/portfolio/new`(프로필이 있을 때만). 상단 메뉴 사람 아이콘의 「프로필 등록」도 `/portfolio/new?step=profile`로 간다 |
| 마이페이지 이동 줄 연결(2026-11-09 별뜨리님 지시: 옛 화면에 구역만 덧붙이지 않는다) | `/mypage` | 예 | 새 처리 함수 없음 | 없음 | 이동 줄 탭 「크리에이터」→`/portfolio/new?step=profile`, 「포트폴리오」→`/portfolio/new`로 간다. `/mypage`에는 옛 「크리에이터 등록」·「포트폴리오 등록」 구역을 그리지 않고 「기본 정보」·「협업 신청」만 남는다(이 둘은 맞출 시안이 아직 없다) |
| 마이페이지 · 포트폴리오 등록 구역(접은 목록, 시안 02·07) | `/mypage` 안 | 예 | `setWorkPublic`(스위치), `deleteWork`(삭제 확인 창), **`reorderWorks(orderedIds)`**(손잡이, 2026-11-09 추가: 내 작품 번호 전체를 원하는 순서로 받아 `sort_order` 저장, 번호가 모자라거나 남의 것이면 거절), 맨 윗줄 「새 포트폴리오 등록」과 「수정」은 편집 칸(`createWork`·`updateWork`…)을 펼침 | 없음 | 내 작품(`MyWork`에 `updatedAt` 추가), 「대표」 칸은 작품 안 맨 위 이미지·영상(없으면 로그라인, `representativeOf`). 「내 기획안」 목록은 이 구역 화면에서 뺐다(코드는 남김) | 작품 편집 `?work=` |
| 크리에이터 프로필(작품별 섹션, 시안 03·08) | `/creators/<handle>` | 아니요 | 본인에게만: `setWorkPublic`(스위치), `reorderWorks`(손잡이) | 없음 | 작품 카드에 `media`(작품 안 이미지·영상, 공개 작품은 `loadWorkMedia`, 본인은 내 요소)와 `isPublic`. 본인이 열면 비공개 작품도 흐리게 보이고 「프로필 편집」 `/mypage#mp-creator`·「포트폴리오 등록」 `/portfolio/new` 버튼이 붙는다 | 작품 `/portfolio/<작품 번호>` |

| 협업 신청 · 크리에이터·작품으로 (2026-11-09, 0010 연결) | `/collab/new?creator=<공개 주소>` / `/collab/new?work=<작품 번호>` (둘 중 하나만, `plan`과 함께 쓰지 않음) | 아니요 | `createCollab`(**기존 함수 그대로, 숨은 칸만 둘 더함**: `creator_handle`, `work_id`. 받는 사람 번호는 화면이 보내지 않는다) | 기존 칸 + 숨은 칸 `creator_handle` 또는 `work_id` | 대상 이름(`getCreator`·`getWork`)과 「○○님께 전달됩니다」. 공개가 아니거나 협업 신청을 안 받는 중이거나 지워진 대상은 「신청할 수 없는 …」 안내. 서버가 대상의 주인을 찾아 받는 사람(`recipient_kind=user`, `recipient_id`)을 정하고, DB(0010 `collab_requests_apply_creator`)가 저장 순간에 한 번 더 정한다 | 접수 `/collab/done`, 취소 `/creators/<공개 주소>`·`/portfolio/<작품 번호>` |
| 협업 신청 버튼 3곳 | 크리에이터 목록 카드 「협업 신청」→`/collab/new?creator=<공개 주소>`, 프로필 「이 크리에이터에게 협업 신청」→`/collab/new?creator=<공개 주소>`, 작품 창 「이 작품에 협업 신청」→`/collab/new?work=<작품 번호>` | 아니요 | 없음 | 없음 | 협업 신청을 받는 중인 크리에이터에게만 보인다. 본인 프로필·비공개 미리 보기에서는 숨김 | 위 협업 신청 화면 |
| 마이페이지·등록 화면의 요소 세부 종류 (0012) | `/mypage`, `/portfolio/new` 안 | 예 | `addTextBlock(workId, body, subKind?)`, `addVideoBlock(workId, url, subKind?)`, `finishFileUpload(workId, {path, kind, name, subKind?})`(**끝에 선택 인자만 더함**), **`setBlockSubKind(blockId, subKind\|null)`**(새 함수) | 영상 칩: 티저·예고편·선공개·파일럿·피치 영상. 글·문서 칩: 시놉시스·트리트먼트·아웃라인·시리즈 바이블·파일럿·피치 문서(시안 01의 글자 그대로, `lib/creator-rules.ts`의 `VIDEO_SUBKINDS`·`DOC_SUBKINDS`). 이미지는 없음 | 요소의 `sub`. 접은 목록 「대표」 칸: 영상은 「티저 영상」처럼, 이미지는 「컨셉 이미지」, 없으면 「로그라인」 | `supabase/migrations/0012_block_sub_kind.sql`을 실행한 뒤 저장된다. 실행 전에는 칩 없이 저장은 되고 칩을 고르면 안내가 나온다 |

| 로그라인을 옮기는 작품 편집 (D35-2, 0013) | `/mypage`·`/portfolio/new` 안, 공개 작품 창 `/portfolio/<작품 번호>` | 예(편집), 아니요(작품 창) | **`reorderWorkItems(workId, items)`**(새 함수. `items`는 이 작품의 요소 번호 전부와 글자 「logline」 하나를 원하는 순서대로 담은 목록. 서버가 요소 순서(`position`)와 로그라인 위치(`logline_position` = 로그라인 앞 요소 개수)를 함께 저장, 번호가 모자라거나 남의 것이면 거절). 기존 `moveBlock`·`reorderBlocks`는 그대로 두되 화면은 이제 쓰지 않는다 | 요소 칸 + 로그라인 블록(손잡이 ⠿·(＋)·↑↓, 지울 수 없음) | `MyWork.loglinePosition`, 공개 작품 `WorkDetail.loglinePosition`. 맨 위에 놓인 것이 「대표」(접은 목록 「대표」 칸: 로그라인이면 「로그라인」, 영상이면 「티저 영상」처럼, 이미지면 「컨셉 이미지」, 글·문서면 고른 종류 또는 「문서」) | `supabase/migrations/0013_logline_position.sql` 실행 뒤 저장된다. 실행 전에는 로그라인 위치가 0(맨 위)으로 읽히고 옮기기를 저장하면 안내가 나온다 |

| 마이페이지 · 크리에이터 등록 · 대표 이미지·영상 올리기 (2026-11-09) | `/mypage` 안 | 예(이메일 확인까지, 프로필이 있어야 올릴 수 있음. 프로필을 만들 때 골라 두면 저장 직후 올린다) | **`prepareHeroUpload({kind, type, size})`**(서버가 로그인·이메일 확인·프로필·형식·크기·합계 20MB를 먼저 보고 보관함에 직접 올릴 1회용 자리 `{path, token}`를 준다) → 브라우저가 `creator-works`에 직접 올림 → **`finishHeroUpload({path, kind, name})`**(서버가 올라온 실제 파일의 크기·형식을 다시 보고 프로필에 걸고, 맞지 않으면 파일을 지운다. 이전 대표 파일은 지움), **`removeHero()`**(지우기) | 파일 하나: 이미지 JPG·PNG·WEBP 5MB 이하 / 영상 MP4(H.264) 10MB 이하(가로 1280×720·15~30초·AAC는 안내만, 서버는 형식·크기만 확인). 영상을 고르면 「영상 변환 프롬프트 복사」 | `MyProfile.hero`(`kind`, `bytes`, 임시 주소 `src`). 파일 합계 20MB에 **대표 파일도 센다**(마이페이지 「파일 n / 20MB」). 공개 프로필의 대표는 공개 화면에서 `lib/creators.ts`가 임시 주소(10분)로 보여 준다 | `supabase/migrations/0014_hero_quota.sql`을 실행하면 DB도 같은 한도를 막는다(실행하지 않아도 서버 동작이 먼저 막는다) |

| 작품 영상 요소의 MP4 파일 첨부 (2026-11-09 아키텍터 결정, D18 개정) | `/mypage`·`/portfolio/new` 안의 작품 편집 칸, 공개 작품 창·프로필 섹션에서 재생 | 예(편집) | 기존 `prepareFileUpload(workId, {kind, type, size})` → 브라우저가 `creator-works`에 직접 올림 → 기존 `finishFileUpload(workId, {path, kind, name, subKind?})`. **`kind`에 「video」가 늘어난 것뿐이고 함수 이름·인자 모양은 그대로다.** 서버가 맨 위에서 로그인·이메일 확인을 다시 하고 작품 주인·요소 20개·합계 20MB·형식(MP4)·크기(10MB)를 먼저 본 뒤에만 올리기 자리를 주고, 올라온 실제 파일을 다시 검사해 영상 요소로 만들며 안 맞으면 파일을 지운다 | 영상 요소 칸에 유튜브 주소 입력과 함께 「영상 파일 첨부 · MP4(H.264) · 10MB 이하 · 가로 1280×720(16:9) · 15~30초 · 소리는 AAC」, 「영상 변환 프롬프트 복사」(글은 `components/mypage/hero-guide.ts` 한 곳), 「파일 고르기」. 유튜브 주소와 파일은 한 요소에 하나만 | 영상 요소(`kind=video`)는 `youtubeId` 또는 파일(`src`·`fileName`·`fileBytes`)을 가진다. 파일 영상은 재생 화면(`<video controls>`)으로 보이고 크리에이터당 파일 합계 20MB에 센다. 목록 카드의 그림(유튜브 대표 그림)은 파일 영상이 맨 위일 때 걸지 않는다 | `supabase/migrations/0015_work_video_file.sql`을 실행해야 저장된다(실행 전에는 올리면 「데이터베이스 준비(0015)가 필요해요」 안내) |

처리 함수 결과 모양: `{ ok: true, …값 } | { ok: false, error, needLogin?, fieldErrors? }` (기획안 동작과 같은 모양).

**코드 전에 보고한 것 (2026-11-07):**

1. 파일 올리기는 Server Action으로 받지 않는다. `next.config.ts`의 요청 크기 한도가 4.5MB이고 Vercel도 4.5MB라서 5MB 이미지·10MB PDF가 통과하지 못한다. 그래서 `prepareFileUpload`가 올릴 자리(1회용 주소)를 주고, 브라우저가 보관함에 직접 올리고, `finishFileUpload`가 서버에서 크기·파일 앞 글자·용량을 다시 검사한 뒤에 요소를 만든다. 통과하지 못하면 올린 파일을 지운다.
2. 기획안 화면의 「포트폴리오에 올리기」(`setPlanPublic`)와 `/portfolio`·`/portfolio/<id>`(`listPortfolio`·`getPortfolio`)는 기획안 단위로 만들어져 있어서 D29(작품 단위)로 바꾸려면 호출 모양이 바뀐다. 별뜨리님 확인 전에는 고치지 않는다.
3. D36은 확정(안 3): 접기는 편집 화면 정리일 뿐이라 저장한 요소는 접어도 남에게 보이고, 요소마다 공개 칸은 없다. 정해지지 않은 것은 하나: 대표 이미지·영상이 사람당 20MB에 드는지. DB의 20MB 검사(0009)는 지금 작품 요소의 이미지·PDF만 센다. 프로필 대표 파일 올리기는 정해질 때까지 만들지 않는다.

## 지난 판: 새 디자인 참고 시안 (위 「크리에이터」 줄이 대신한다)

별뜨리님이 보여 주신 Figma 시안 「크리에이터 포트폴리오 탐색」(Desktop 1440 / Mobile 375)과 「크리에이터 프로필」은 **지금 코드에 없는 화면**이다. 코드에 있는 비슷한 화면은 `/portfolio`(기획안 목록)뿐이고, 크리에이터·프로필 화면의 처리 함수·데이터는 아직 없다. 이 화면들을 만들려면 먼저 어떤 데이터를 쓸지 정하고 이 표에 줄을 더해 승인받는다. 랜딩과 시안이 다르면 랜딩을 따른다.


채널 링크 저장(`saveCreatorProfile`·`saveChannels`)은 DB 함수 `replace_creator_channels`(`0011_creator_channels_replace.sql`, 사용자가 실행)를 한 번 불러 한 트랜잭션으로 바꾼다. 0011을 실행하기 전에는 채널 링크 저장이 실패한다.
| 운영자 · 협업 신청 현황 (2026-11-11 별뜨리님 지시) | `/admin` | 예 (이메일 확인 + 운영자 표시 `admins`가 있는 계정만. 아니면 404) | **`adminDeleteLog(requestId)`**(새 함수. 맨 위에서 로그인·이메일 확인·운영자 표시를 다시 확인. 아클링스 앞 신청은 실제 신청·첨부까지 지우고 목록에서도 치움, 남에게 온 신청은 운영자 목록에서만 치움). 조건·정렬은 처리 함수 없이 주소 값(GET)으로 | 필터 칸: `kind`, `recipient`, `status`, `role`, `target`, `period`, `reply`, `stale`, `q` / 숨김 `sort`, `dir` / 쪽 `page` | `collab_log`(0016)만 읽는다: 접수 시각·받는 사람·대상·역할·상태·상태 바뀐 시각·답장 수·신청자 이름. 내용·연락처·첨부는 없다. 지표(신청 수·상태 비율·수락률·첫 응답 시간·3일 넘게 접수·주별·받는 사람별 처리율)는 목록에서 치운 줄도 센다. 표 머리글(접수 시각·받는 사람·대상·상태·상태 바뀐 시각·답장·신청자)을 누르면 오름차순·내림차순 정렬 | 신청자 이름(아클링스 앞·미삭제)→`/collab/<번호>`. `supabase/migrations/0016_admin_collab_log.sql`을 실행해야 보인다(실행 전에는 안내만) |
