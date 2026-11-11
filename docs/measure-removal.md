# 측정 도구 들어내는 방법

측정 도구는 두 가지다. ① **방문 통계**(Vercel Web Analytics, 패키지 `@vercel/analytics`) ② **사용 기록**(정해진 행동 7가지를 DB 표 `usage_events`에 남기는 것). 둘 다 코드는 `lib/measure/` 폴더 하나에 모여 있다. 화면과 서버는 그 폴더의 출입구 두 파일의 이름만 부른다.

- 브라우저·화면 쪽 출입구: `lib/measure/client.ts` → `trackEvent`, `TrackOnMount`, `MeasureAnalytics`, 타입 `UsageEvent`
- 서버 쪽 출입구: `lib/measure/server.ts` → `trackServer`, `handleUsageEvent`, `USAGE_LOG`, `MEASURE_ENABLED`, 운영자 사용 기록 화면용 `UsageView`·`loadUsage`·`parseUsageQuery`
- 켜고 끄는 스위치: `lib/measure/config.ts`의 `MEASURE_ENABLED` 한 줄(지금 `true`)

기준: 계획 문서 D16(측정 도구와 모델이 바뀔 수 있으니 필요할 때 깔끔하게 들어내고 갈아 끼울 수 있게 한다). 폴더 이름·스위치 방식·이 문서는 계획 세션이 정한 것이다.

## 1. 잠깐 끄기 (파일을 지우지 않는다)

`lib/measure/config.ts`에서 `MEASURE_ENABLED`를 `false`로 바꾼다. 그러면:

- 방문 통계 부품(`MeasureAnalytics`)이 아무것도 그리지 않는다.
- 브라우저의 `trackEvent`가 아무것도 보내지 않고, 서버의 `trackServer`·`recordUsageEvent`가 DB를 부르지 않는다.
- `POST /api/events`는 요청을 받아도 아무것도 남기지 않고 204만 돌려준다.
- `/privacy`의 「서비스 이용 기록」 구역이 사라진다.
- `/admin/usage`(운영자 사용 기록 화면)가 404가 되고, `/admin`의 「사용 기록 보기」 단추가 사라진다.

**꺼지지 않는 것:** 홈(`public/landing.html`)의 방문 통계 스크립트 한 줄(1754행 `<script defer src="/_vercel/insights/script.js"></script>`)은 고정 HTML이라 이 스위치와 무관하다. 홈 방문 통계까지 끄려면 그 줄을 직접 지운다. 또 이미 브라우저에 만들어진 쿠키 `arklings_anon`은 남는다(쿠키는 더 이상 새로 만들어지지 않는다).

## 2. 통째로 들어내기: 접점 목록

아래가 측정 도구가 닿는 모든 곳이다(2026-11-11 기준 줄 번호).

| 파일 | 줄 | 내용 | 들어낼 때 |
|---|---|---|---|
| `lib/measure/` 폴더 전체 | — | 측정 도구 본체(`config`·`events`·`track`·`track-on-mount`·`analytics`·`record`·`handler`·`privacy-text`·`admin`·`admin-view`·`client`·`server`) | 폴더 통째로 지운다 |
| `app/layout.tsx` | 3, 38 | `import { MeasureAnalytics }`, `<MeasureAnalytics />` | 두 줄(주석 포함 세 줄)을 지운다 |
| `app/admin/usage/page.tsx` | 파일 전체 | 운영자 · 사용 기록 화면(`/admin/usage`, 내용은 `lib/measure/admin.ts`·`admin-view.tsx`) | 파일을 지운다(`app/admin/usage/` 폴더도) |
| `app/admin/page.tsx` | 22, 56~58 | `import { MEASURE_ENABLED }`와 `{MEASURE_ENABLED && ( … 「사용 기록 보기」 링크 )}` | import 한 줄과 링크 덩어리를 지운다 |
| `app/api/events/route.ts` | 파일 전체 | 브라우저가 행동을 알리는 길(`POST /api/events`) | 파일을 지운다(`app/api/events/` 폴더가 비면 폴더도) |
| `app/planner/page.tsx` | 4, 27, 74 | `import { TrackOnMount }`, `<TrackOnMount event="planner_open" />` 두 곳 | 세 줄을 지운다 |
| `app/actions/auth.ts` | 11, 96, 153 | `import { trackServer }`, 가입(`signup`)·이메일 로그인(`login`) 기록 두 줄 | 세 줄을 지운다 |
| `app/auth/callback/route.ts` | 8, 48 | `import { trackServer }`, 구글·카카오 로그인(`login`) 기록 한 줄 | 두 줄을 지운다 |
| `components/planner/planner-editor.tsx` | 30, 244, 251, 322 | `import { trackEvent }`, 저장(`plan_save`) 두 곳, 포트폴리오 작성하기(`portfolio_start_click`) | 네 줄을 지운다 |
| `components/ai/evaluation-section.tsx` | 6, 20 | `import { trackEvent }`, `ai_evaluate_click` | 두 줄을 지운다 |
| `components/ai/library-chat.tsx` | 7, 93 | `import { trackEvent }`, `library_ask` | 두 줄을 지운다 |
| `app/privacy/page.tsx` | 4, 33~58 | `import { MEASURE_ENABLED, USAGE_LOG }`와 `{MEASURE_ENABLED && ( … )}` 안의 「서비스 이용 기록」 `<section>` 전체 | import 한 줄과 그 구역을 지운다 |
| `public/landing.html` | 1754 | 홈 방문 통계 스크립트 한 줄 | 그 줄을 지운다 |
| `package.json`, `package-lock.json` | 18 | `@vercel/analytics` | `npm uninstall @vercel/analytics`(패키지 변경이라 사용자 승인 후) |
| `AGENTS.md` | 「사용 기록(`0021_usage_events.sql`)」 항목 | 측정 도구 설명 | 그 항목을 지우거나 「들어냄」으로 고친다 |
| DB `usage_events` 표와 함수 | — | `supabase/migrations/0021_usage_events.sql`이 만든 것 | 4번의 SQL |
| Vercel 대시보드 | — | Web Analytics 켜기 | 끈다 |

`supabase/migrations/0021_usage_events.sql` 파일은 지우지 않는다(이미 실행한 이력이다. 번호 파일은 덮어쓰지 않는다).

## 3. 지우는 순서

1. **코드가 DB를 더 이상 부르지 않게 먼저 한다.** `MEASURE_ENABLED`를 `false`로 바꿔 배포하거나, 곧바로 2번의 코드 줄을 지운다. DB를 먼저 지우면 아직 켜져 있는 코드가 존재하지 않는 함수를 부르려다 조용히 실패한다(화면은 안 깨지지만 오류가 쌓인다).
2. 2번 표의 접점 줄을 위에서부터 지운다(`app/…`, `components/…`). 각 줄을 지울 때 같이 쓰는 import도 지운다.
3. `lib/measure/` 폴더를 지운다. (파일 삭제는 훅이 막으므로 지울 파일과 이유를 설명하고 허락받은 뒤에만 한다.)
4. `app/api/events/route.ts`와 `app/admin/usage/`를 지우고, `app/admin/page.tsx`의 「사용 기록 보기」 링크와 import를 지운다.
5. `/privacy`의 「서비스 이용 기록」 구역과 import를 지운다.
6. `public/landing.html`의 방문 통계 스크립트 한 줄을 지운다.
7. `npm uninstall @vercel/analytics`(승인 후).
8. `npx tsc --noEmit`, `npm run lint`, `npm run build`가 통과하는지 확인한다.
9. 배포가 끝난 뒤 DB의 표와 함수를 지운다(4번). 실행은 사용자가 Supabase SQL Editor에서 한다.
10. Vercel 대시보드에서 Web Analytics를 끈다. 사용자가 한다.
11. `AGENTS.md`의 해당 항목을 정리한다.

## 4. DB에서 `usage_events`를 없애는 SQL (실행하지 않는다, 기록만)

기록된 행동 데이터가 모두 사라진다. 되돌릴 수 없으니 필요하면 먼저 내려받는다. 코드를 들어낸 배포가 끝난 뒤 실행한다.

```sql
-- 사용 기록(0021)을 없앤다. 표를 지우면 그 표의 인덱스·읽기 정책도 함께 지워진다.
drop function if exists public.record_usage_event(text, text, text, jsonb);
drop table if exists public.usage_events;
```

## 5. 개인정보처리방침에서 지울 구역

`/privacy`(`app/privacy/page.tsx`)의 **「서비스 이용 기록」** 구역 하나다. 제목 아래에 「수집 항목」「이용 목적」「보관 기간」 세 칸과, 아래 두 문장의 목록이 있다.

- 「방문 수·방문한 화면 같은 집계 통계는 Vercel Web Analytics로 모읍니다.」
- 「브라우저의 「추적 안 함」 설정을 켜 두시면 이 이용 기록을 남기지 않습니다.」

글은 `lib/measure/privacy-text.ts`(폴더와 함께 지워진다)에 있고, 화면 구역은 `app/privacy/page.tsx`의 `{MEASURE_ENABLED && ( … )}` 덩어리다. 이 구역은 가입 동의 문구(`lib/consent.ts`의 `CONSENT_ITEMS`)와 따로라서 `CONSENT_VERSION`은 올리지 않았고, 지울 때도 올릴 필요가 없다. 다만 「추가 안내(작성 예정)」 목록의 개인정보 고지 항목은 이 구역과 관계없다.

## 6. 남는 것·주의

- 사용 기록만 끄고 방문 통계는 두고 싶거나 그 반대인 경우는 스위치가 하나라서 안 된다. 나누려면 `config.ts`에 스위치를 하나 더 만들어야 한다(지금은 만들지 않았다).
- 측정을 끄면 `lib/measure/events.ts`의 허용 목록과 DB 함수(`record_usage_event`)는 그대로 두어도 해가 없다. 다만 DB 함수는 로그인 없이도 부를 수 있게 열려 있으므로(분당 60건 한도), 오래 끌 거라면 4번으로 함수를 지우는 편이 좋다.
