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
| 상단 메뉴 | `components/site-nav.tsx` | 로고, 메뉴, 「로그인」/「마이페이지」/「받은 협업 신청」/「로그아웃」, 「기획안 만들기」(→`/planner`) | 상단 메뉴는 페이지(`components/site-header.tsx`가 `getCurrentUser()`로 확인)가 넘겨 주는 `loggedIn` 값으로 로그인 여부를 안다. `/api/session`은 랜딩(`public/landing.html`)만 부른다. 메뉴 디자인을 새로 만들어도 이 확인 방식은 그대로 둔다. 「로그인」 링크는 `/login?next=<지금 주소>`(로그인·가입·`/auth/*` 화면에서는 `/login`). 「로그아웃」은 `signOut()` |
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
| 로그인 상태 확인 | `/api/session` | - | 없음 | 랜딩(`public/landing.html`)만 부른다(상단 메뉴 컴포넌트는 안 부른다). 만지지 않는다 |
| 정리 작업 | `/api/cron/cleanup` | 비밀값 | 없음 | 화면 없음 |
| 인증 돌아오는 길 | `/auth/callback`, `/auth/confirm` | - | 없음 | 화면 없음. 만지지 않는다 |

## 크리에이터 (2026-11-07 줄 추가, `dev` ebde7b4 기준 · DB는 0009 실행 완료)

읽기는 `lib/creators.ts` 한 곳이고 DB의 공개용 보기 4개(`creators_public`, `creator_channels_public`, `creator_works_public`, `creator_blocks_public`)에서만 읽는다. 주인 번호·이메일은 화면·주소·화면 소스 어디에도 내지 않는다. 파일(이미지·PDF)은 비공개 보관함 `creator-works`에 있고 보여 줄 때만 짧은 임시 주소(10분)를 만든다. 쓰기는 모두 `app/actions/creators.ts`의 Server Action이며 맨 위에서 로그인·이메일 확인을 다시 하고, 로그인한 본인 연결(`createAuthClient`)과 RLS로 실행한다. 글자 수·개수 규칙은 `lib/creator-rules.ts` 한 곳.

| 화면 | 주소 | 로그인 필요 | 부르는 처리 함수 | 입력 칸 / 인자 | 화면에 받는 데이터 | 이동 |
|---|---|---|---|---|---|---|
| 크리에이터 목록 | `/creators?q=&role=&genre=&form=&open=&page=` | 아니요 | 없음(읽기만: `listCreators(filter, page)`) | 주소 값 `q`(30자), `role`(역할 하나), `genre`(장르 하나), `form`(long·short), `open`(1), `page` | `cards[]`(`CreatorCard`와 같은 값: `handle`, `name`, `roles`, `bio`(앞부분), `planCount`(공개 작품 수), `openToCollab`, `genres`, `forms`, `latest`(없을 수 있음), `hero`, `heroSrc`(임시 주소)), `total`, 쪽 수(`CREATOR_PAGE_SIZE`). 공개 프로필만, 작품 0건이어도 나온다(D7) | 카드 `/creators/<handle>`, 협업 신청 `/collab/new?creator=<handle>`(0010 뒤에 열림), 비었을 때 「기획안 만들기」 `/planner`·「크리에이터 프로필 만들기」 `/mypage` |
| 크리에이터 프로필 | `/creators/<handle>` (작품 창: `?work=<작품 번호>`) | 아니요 (본인은 비공개도 봄) | 없음(읽기만: `getCreator(handle)`, `listCreatorWorks(handle)`, `getWork(id)`) | 없음 | 프로필(`handle`, `name`, `roles`, `bio`, `channels[]`, `openToCollab`, `hero`·`heroSrc`), 작품 카드 `WorkCard[]`(`id`, `title`, `logline`, `roles`, `genres`, `kind`, `form`, `publishedAt`), 작품 상세(`WorkDetailData`: 위 값 + 순서대로 `blocks[]` 글·이미지·영상·문서, 파일은 임시 주소). 공개가 아니고 본인도 아니면 404. 본인이 비공개 프로필을 열면 「비공개 상태입니다」 표시와 협업 신청 버튼 숨김(D13) | 작품 창 닫기 `/creators/<handle>`, 「이 작품에 협업 신청」·「이 크리에이터에게 협업 신청」은 0010 뒤에 `/collab/new?…` |
| 작품 공유 주소 | `/portfolio/<작품 번호>` | 아니요 | 없음(읽기만: `getWork(id)`) | 없음 | 위 작품 상세. 공개가 아니면 404 | 「프로필 보기」 `/creators/<handle>` (D29) |
| 마이페이지 · 크리에이터 등록 구역 | `/mypage` 안 | 예 | `saveCreatorProfile`, `setProfilePublic`, `checkHandle` | `handle`, `roles`(여러 개), `bio`(소개 글 500자, 선택), `channels`(이름 20자·https 주소, 5개까지), `openToCollab`, `isPublic` | 내 프로필·채널(로그인한 본인 연결로 읽음). 결과 `{ok:true, created, handle}` / `{ok:false, error, fieldErrors?}` | 내 프로필 주소 `/creators/<handle>` |
| 마이페이지 · 포트폴리오 등록 구역 | `/mypage` 안 | 예 | `createWork`, `updateWork`, `deleteWork`, `setWorkPublic`, `addTextBlock`, `updateTextBlock`, `addVideoBlock`, `prepareFileUpload`→(브라우저가 보관함에 직접 올림)→`finishFileUpload`, `moveBlock`, `reorderBlocks`, `deleteBlock` | 작품: `title`(60자), `roles`, `genres`, `kind`, `form`, `logline`(띄어쓰기 뺀 200자), `planId`. 요소: 글 5000자, 유튜브 주소, 이미지 JPG·PNG·WEBP 5MB, PDF 10MB, 사람당 합계 20MB, 작품 12개, 작품당 요소 20개 | 내 작품·요소(본인 연결로 읽음), 용량·개수 | 작품 창은 위와 같음 |
| 기획안 화면 · 포트폴리오에 올리기 | `/planner` | 예 | **정해지지 않음. 아래 「보고」 참고** | - | - | - |

처리 함수 결과 모양: `{ ok: true, …값 } | { ok: false, error, needLogin?, fieldErrors? }` (기획안 동작과 같은 모양).

**코드 전에 보고한 것 (2026-11-07):**

1. 파일 올리기는 Server Action으로 받지 않는다. `next.config.ts`의 요청 크기 한도가 4.5MB이고 Vercel도 4.5MB라서 5MB 이미지·10MB PDF가 통과하지 못한다. 그래서 `prepareFileUpload`가 올릴 자리(1회용 주소)를 주고, 브라우저가 보관함에 직접 올리고, `finishFileUpload`가 서버에서 크기·파일 앞 글자·용량을 다시 검사한 뒤에 요소를 만든다. 통과하지 못하면 올린 파일을 지운다.
2. 기획안 화면의 「포트폴리오에 올리기」(`setPlanPublic`)와 `/portfolio`·`/portfolio/<id>`(`listPortfolio`·`getPortfolio`)는 기획안 단위로 만들어져 있어서 D29(작품 단위)로 바꾸려면 호출 모양이 바뀐다. 별뜨리님 확인 전에는 고치지 않는다.
3. D36은 확정(안 3): 접기는 편집 화면 정리일 뿐이라 저장한 요소는 접어도 남에게 보이고, 요소마다 공개 칸은 없다. 정해지지 않은 것은 하나: 대표 이미지·영상이 사람당 20MB에 드는지. DB의 20MB 검사(0009)는 지금 작품 요소의 이미지·PDF만 센다. 프로필 대표 파일 올리기는 정해질 때까지 만들지 않는다.

## 지난 판: 새 디자인 참고 시안 (위 「크리에이터」 줄이 대신한다)

별뜨리님이 보여 주신 Figma 시안 「크리에이터 포트폴리오 탐색」(Desktop 1440 / Mobile 375)과 「크리에이터 프로필」은 **지금 코드에 없는 화면**이다. 코드에 있는 비슷한 화면은 `/portfolio`(기획안 목록)뿐이고, 크리에이터·프로필 화면의 처리 함수·데이터는 아직 없다. 이 화면들을 만들려면 먼저 어떤 데이터를 쓸지 정하고 이 표에 줄을 더해 승인받는다. 랜딩과 시안이 다르면 랜딩을 따른다.
