# Arklings

아클링스는 한국 신화·고대사 기반 IP를 여러 크리에이터가 함께 만드는 참여형 제작 스튜디오다.
이 저장소는 미션 5 브랜드 랜딩이다. 홈에서 아클링스를 소개하고, 핵심 행동인 「협업 신청」으로 신청 화면을 연다.

- GitHub: https://github.com/byeolthree/arklings-landing
- 배포: https://arklings-main-deploy.vercel.app

## 기술 스택

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4
- shadcn/ui (`Button`, `Input`, `Textarea`, `Badge`)
- 폰트: Noto Sans KR, Noto Serif KR (`next/font`)

로그인, 회원가입, 실제 데이터 저장, Supabase, 결제, OpenAI, 스튜디오 화면은 이 미션 범위가 아니다.

## 화면

- `/` 홈: 제작 중인 협업 사례(악의 꽃), 아이디어 카드, 아클링스 소개 영상과 카피
- `/apply` 협업 신청: 가운데 카드 폼(이름/소속, 연락처, 방문 목적, 원하는 것, 예산/가격대)

홈의 「협업 신청」은 `/apply`로 이동한다. 킹덤·스튜디오·크리에이터·라이브러리·커뮤니티·마이페이지는 내비게이션에 글자만 있고, 페이지는 없다. 「실현하기」도 이동하지 않는다.

## 인터랙션

- 1024px 미만에서 햄버거 메뉴를 열고 닫는다.
- 모바일 홈에서 「더 알아보기」로 소개 문장을 펼친다.
- 신청서 보내기를 누르면 버튼이 「처리 중...」으로 바뀐 뒤, 완료 카드 또는 오류 문구로 교체된다. 주소는 `/apply`에 남는다.

신청 완료는 화면 전환만 한다. 서버에 저장하거나 메일을 보내지 않는다. 「마이페이지로 이동」은 버튼만 있고 마이페이지는 없다.

## 실행 방법

Node.js가 필요하다.

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 연다. 배포용 확인은 `npm run build`다.

## 배포 흐름

작업은 `dev`에서 진행하고, 검수한 미션 5 변경만 `main`에 반영한다. Vercel 프로젝트 `arklings-main-deploy`는 GitHub 저장소의 `main` 브랜치를 Production으로 추적한다. `main`에 새 커밋을 푸시한 뒤 Vercel의 배포 상태와 공개 주소를 확인한다.
