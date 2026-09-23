<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 아클링스 미션 5 작업 규칙

## 아클링스 목적

아클링스는 한국 고대사 기반 IP를 여러 크리에이터가 함께 만드는 참여형 제작 스튜디오다.
이번 미션에서는 아클링스 브랜드 랜딩 페이지를 구현한다.
홈 CTA는 「협업 신청」이며, 목적지는 협업 신청 페이지다.

## 기술 스택

Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui를 사용한다.

## 이번 미션 범위

다음을 구현한다.

- 히어로
- 제작 중인 협업 사례
- 홈 CTA 「협업 신청」 (목적지는 협업 신청 페이지)
- 협업 신청 페이지
- 반응형 레이아웃
- 목적에 맞는 JavaScript 인터랙션 1개(예: 모바일 메뉴)
- 기본 메타데이터와 접근성

## 이번 미션 제외 범위

다음을 구현하지 않는다.

- 로그인, 회원가입
- 실제 데이터 저장
- Supabase
- 결제, 후원
- OpenAI API
- 관리자 기능
- 실제 제작 상태 집계
- 정적 스튜디오 피드와 스튜디오 화면 (나중에 별도로 추가)
- SNS에서 아클링스 콘텐츠를 보고 들어온 사용자가 홈을 거치지 않고 스튜디오의 해당 콘텐츠로 직접 접속하는 흐름 (홈 CTA와 연결하지 않음)

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
배포 전 `npm run build`를 실행한다.

## Git 작업 흐름

일상 구현과 검수는 `dev`에서만 한다.
승인된 작업 범위 안에서는 `dev`에 기능·수정 단위로 커밋하고 푸시할 수 있다. 커밋마다 사용자 승인을 다시 받지 않아도 된다.
커밋 전에는 변경 파일과 검수 결과를 확인하고, 범위 밖 파일이나 비밀값을 포함하지 않는다.
`main` 병합, `main` 푸시, Vercel 배포는 사용자의 명시적 승인 전에는 하지 않는다.

## 작업 시작 원칙

구현 전에는 Plan 모드에서 현재 프로젝트, 미션 요구사항, Figma 시안, 수정할 파일, 검수 방법을 먼저 확인한다.
사용자 승인 전에는 코드나 설정을 수정하지 않는다.

## 승인 필요 작업

새 패키지 설치, 외부 서비스 연결, 환경 변수 추가, 개인정보 처리, 결제 또는 비용 발생 작업은 사용자 승인 없이 진행하지 않는다.
