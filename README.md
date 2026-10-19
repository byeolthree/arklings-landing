# 아클링스 협업 신청 (Mission 6)

한국 신화·고대사 기반 IP 스튜디오 **아클링스**의 랜딩 페이지와, 협업을 신청하는 **CRUD 기능**입니다.
Next.js(App Router, Server Actions) + Supabase(DB·Storage) + Vercel.

- 배포 주소: _(배포 후 기입)_
- 저장소: _(GitHub 주소 기입)_

## 기능 명세 — 협업 신청

화면은 Figma 「협업 신청」 시안(편지 카드, 데스크톱·모바일, 접수 완료 화면)을 그대로 따릅니다.

| 화면 | 주소 | 하는 일 |
|---|---|---|
| 랜딩 | `/` | v14 랜딩. "협업 문의하기" → 협업 신청, "지금 시작하기" → 기획안 만들기(`/planner.html`) |
| 협업 신청 | `/collab/new` | 신청 등록 (`/apply`는 여기로 이동) |
| 접수 완료 | `/collab/done` | "신청이 접수됐습니다" 안내, 신청 내용 보기 버튼 |
| 신청 목록 | `/collab` | 최신순 10개씩, 상태별 보기, 쪽 이동, 빈 상태 안내 |
| 신청 상세 | `/collab/[id]` | 전체 내용, 첨부 이미지 미리보기/PDF 링크, 수정·삭제 |
| 신청 수정 | `/collab/[id]/edit` | 모든 칸과 상태 수정, 첨부 파일 교체·삭제 |

**입력 칸:** 이름/닉네임(필수), 연락처 이메일 또는 전화번호(필수), SNS 아이디(필수), 신청 대상(기본 "특정 이야기 아님", 또는 작품 선택), 역할(중복 선택, 1개 이상 필수: 영상 제작·대본·아트디렉터·역사 자문·책임 프로듀서·기타), 하고 싶은 일/아이디어(필수, 10~1000자), 작업 링크(필수, http/https), 작업 파일 첨부(선택, PDF·JPG·PNG 4MB 이하), 개인정보 동의(필수), 상태(수정할 때만: 접수·검토 중·수락·거절).

**성공/실패:** 신청하면 접수 완료 화면으로 이동합니다. 입력 오류는 칸 아래에 이유를 보여 주고 입력값을 유지합니다. 저장 중에는 버튼이 잠깁니다. 삭제는 확인 후 신청과 첨부 파일을 함께 지웁니다. 없는 번호는 404 화면이 나옵니다.

이번 미션은 로그인과 접근 제한(RLS)이 없고, 실제 개인정보 없이 테스트 값만 씁니다.

## 테이블 구조

전체 SQL은 [`supabase/schema.sql`](supabase/schema.sql).

- `source_works`: id, title, sort_order, created_at — 악의 꽃 / 사다함의 꿈 / 단 하나의 꿈
- `collab_requests`: id, applicant_name, contact, sns_handle, source_work_id(비어 있으면 전체 협업 제안), roles(여러 개), idea, portfolio_url, consent, attachment_path, attachment_name, status, created_at, updated_at
- Storage 버킷 `collab-attachments` (공개 읽기, PDF·JPG·PNG, 4MB)

## 실행 방법

1. Supabase 프로젝트를 만들고 SQL Editor에서 `supabase/schema.sql`을 실행합니다.
2. `.env.example`을 `.env.local`로 복사해 값을 채웁니다.
3. `npm install` → `npm run dev` → http://localhost:3000

## 환경 변수 (이름만)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

값은 `.env.local`과 Vercel 환경 변수에만 넣고 GitHub에는 올리지 않습니다.

## QA 결과

_(배포 후 기입: 빈 제출, 잘못된 입력, 등록→목록/상세, 새로고침 유지, 수정·삭제 반영, 없는 주소 404, 파일 없음/형식·용량 오류)_
