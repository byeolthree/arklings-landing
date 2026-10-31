-- 미션7 단계 6: 정리 작업(3개월 지난 협업 신청·짝 없는 파일·오래된 기록 삭제)의 실행 기록.
-- Supabase 화면의 SQL Editor에서 0004 다음에 실행한다. 기존 데이터는 지우지 않고, 여러 번 실행해도 안전하다.
--
-- 정리 작업은 앱 서버(Vercel 예약 작업)가 서버 전용 열쇠로 실행한다. 이 표는 그 결과를 남기는 곳이다.
-- 「3개월 뒤 삭제」는 처리방침의 약속이므로, 실행이 멈추거나 실패했는지 여기서 확인한다.
create table if not exists public.cleanup_runs (
  id                bigint generated always as identity primary key,
  ran_at            timestamptz not null default now(),
  deleted_requests  integer not null default 0,   -- 접수 3개월이 지나 지운 협업 신청
  deleted_files     integer not null default 0,   -- 그 신청의 첨부 파일
  orphan_files      integer not null default 0,   -- 신청과 연결되지 않아 지운 짝 없는 파일
  deleted_other     integer not null default 0,   -- 오래된 봇 방지 기록·메일 횟수 기록
  errors            text,                          -- 실패한 일(없으면 비어 있음)
  ok                boolean not null default true
);
create index if not exists cleanup_runs_ran_at_idx on public.cleanup_runs (ran_at desc);
alter table public.cleanup_runs enable row level security;
-- 정책 없음 → 서버 전용 열쇠만 읽고 쓴다.

-- 3개월이 지난 신청을 빨리 찾기 위한 색인
create index if not exists collab_requests_created_idx on public.collab_requests (created_at);
