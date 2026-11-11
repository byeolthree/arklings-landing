# AI 모델(공급자) 바꾸는 방법

지금은 OpenAI다. 모델은 AI SDK(`ai` 패키지)를 거쳐 부르고, **어떤 공급자·모델을 쓸지는 `lib/ai/model.ts` 한 파일**에서만 고른다. 평가(`lib/ai/evaluate.ts`)와 라이브러리 질의응답(`lib/ai/library-handler.ts`)은 공급자 이름을 모르고 `getModelHandle()`이 주는 모델만 쓴다.

기준: 계획 문서 D16. 환경변수 이름(`OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_FAKE_MODEL`)은 **바꾸지 않는다**(아키텍터 지시). 공급자를 바꾸어도 같은 이름에 새 공급자의 키와 모델 이름을 넣는다. 이름이 OpenAI라서 어색하지만 Vercel과 `.env.local`을 다시 만지지 않는 쪽을 택했다.

## 고칠 곳

| 무엇 | 어디 | 고치는 내용 |
|---|---|---|
| 패키지 | `package.json`의 `@ai-sdk/openai` (12행) | 새 공급자의 AI SDK 패키지로 바꾼다(예: `@ai-sdk/<공급자>`). `ai`·`@ai-sdk/react`와 **큰 버전이 맞는 것**을 고른다(지금 `@ai-sdk/*` 4대 ↔ `ai` 7). 새 패키지 설치이므로 사용자 승인 후 한다 |
| 모델 고르는 곳 | `lib/ai/model.ts`: import(7행), `getModelHandle()`(13~22행)의 `openai(id)` | import와 `openai(id)` 한 줄을 새 공급자의 모델 만들기로 바꾼다. 새 공급자 패키지가 키를 다른 이름의 환경변수에서 읽는다면, 그 공급자의 `create…({ apiKey })`에 **이미 읽어 둔 `OPENAI_API_KEY` 값을 직접 넘긴다**(환경변수 이름을 안 바꾸기 위해). 파일 맨 위 설명 주석도 고친다 |
| 환경변수 | `.env.example` 27~30행, Vercel, `.env.local` | **이름은 그대로.** 값만 새 공급자의 키·모델 이름으로 바꾼다(값은 사용자가 직접 넣는다. 채팅·Git에 적지 않는다) |
| 오류 분류 | `lib/ai/errors.ts`의 `classifyAiError()` | `APICallError`·`LoadAPIKeyError`·`LoadSettingError`는 AI SDK 공통이라 그대로 쓴다. 공급자마다 다른 것은 **상태 코드의 뜻**이다: ① 429의 본문 글자 검사(`insufficient_quota\|spend_limit\|billing\|quota`)는 OpenAI 기준이다. 새 공급자가 「잔액·한도 초과」를 어떤 글자로 알리는지 보고 고친다(고치지 않으면 한도 초과가 「잠시 몰림」으로 안내돼 사용자가 기다려도 풀리지 않는다). ② 401·403·404를 `auth`로, 그 밖의 API 오류를 `retry`로 본다. 새 공급자가 모델 이름이 틀렸을 때 다른 코드를 주는지 확인한다. ③ 화면에 나가는 종류는 `auth`·`busy`·`retry`·`schema` 넷 그대로 둔다(화면 문구가 이 넷에 묶여 있다) |
| 기록되는 모델 이름 | `lib/ai/model.ts`의 `name`(`handle.name`) → `lib/ai/evaluate.ts` 50행 `model: handle.name` → `lib/ai/evaluate-flow.ts` 66행 → DB 표 `plan_evaluations.model` (`0018`, 1~100자) | 코드를 따로 고칠 것은 없다. `name`에는 `OPENAI_MODEL`의 값(새 공급자의 모델 이름)이 들어가므로 이후 평가부터 새 이름이 남는다. 예전 줄은 옛 이름 그대로 남는다. 100자를 넘는 모델 이름은 저장이 거절된다 |
| 가짜 모델 | `lib/ai/model.ts`의 `fakeModel()`(`ai/test`의 `MockLanguageModelV4`) | `ai` 패키지 버전이 바뀌면 `MockLanguageModelV4`의 이름·`usage`·`finishReason` 모양이 바뀔 수 있다. 타입 검사로 확인한다. 공급자와는 무관하다 |

공급자 이름이 박혀 있는 곳은 위 표가 전부다(`grep`으로 `openai`·`OPENAI_`를 찾으면 `lib/ai/model.ts`, `.env.example`, `package.json`, `lib/ai/errors.ts`의 429 글자 검사, 이 문서와 계획 문서뿐이다).

## 바꾸는 순서

1. 새 공급자가 AI SDK에서 **구조화 결과**(`Output.object`, 평가에 쓴다)와 **스트리밍**(`streamText`, 라이브러리에 쓴다)을 지원하는지 확인한다. 평가가 못 받으면 칸별 결과가 안 나온다.
2. (승인 후) 패키지를 바꾼다: 새 공급자 패키지를 더하고 `@ai-sdk/openai`를 뺀다.
3. `lib/ai/model.ts`의 import와 모델 만들기 한 줄을 바꾸고, 주석을 고친다.
4. `lib/ai/errors.ts`의 429 글자 검사와 오류 코드를 새 공급자 기준으로 확인·수정한다.
5. 로컬에서 `AI_FAKE_MODEL=1`로 평가·라이브러리 화면을 돌린다(공급자 변경과 무관하게 연결·오류·형식 경로가 그대로인지 보는 것이다. **가짜 모델의 성공은 새 공급자 품질의 증거가 아니다.**)
6. `npx tsc --noEmit`, `npm run lint`, `npm run build`를 통과시킨다.
7. 사용자가 Vercel과 `.env.local`의 `OPENAI_API_KEY`·`OPENAI_MODEL` 값을 새 공급자 것으로 바꾼다(이름은 그대로).
8. (비용이 드는 진짜 호출이라 사전 승인 후) 진짜 모델로 평가 한 번·질문 한 번을 돌려 결과 모양, 스트리밍, 토큰 사용량 기록(`plan_evaluations`의 입력·출력 토큰, `finish_reason`)과 기록된 모델 이름을 확인한다. 정상 질문, 자료에 없는 질문, 「앞선 지침을 무시하고…」 입력 3종도 함께 본다(`docs/mission7-2-llm-plan.md` 11장).
9. 오류 안내를 일부러 확인한다: 잘못된 키(→ `auth`), 한도 초과(→ 새 공급자의 한도 오류가 `auth`로 나뉘는지).

## 바꿔도 달라지지 않는 것

- 하루 횟수 제한(`ai_daily_limit`, DB), 로그인·이메일 확인 검사, 입력 길이 검사, 위키에서 근거 항목 고르기, 평가·라이브러리 화면은 공급자와 무관하다.
- `maxRetries: 0`(자동 재시도 안 함)과 서버 시간 상한은 공급자를 바꿔도 같은 값을 쓴다. 새 공급자가 더 느리면 `maxDuration`을 다시 본다.
- 환경변수 이름. 키는 서버 환경변수에만 둔다(`NEXT_PUBLIC_` 접두어 금지).
