-- 프로젝트(외주 매칭) 2단계 ⑤: 마감일이 지난 공고를 하루 한 번 닫고, 접수 상태로 남은 지원을 거절하는 예약 실행.
-- Supabase 화면의 SQL Editor에서 0032 다음에 실행한다(0025와 같은 방식). 여러 번 실행해도 안전하다(같은 이름의 일정은 덮어쓴다).
--
-- 규칙 요약
--   · 매일 18:10(UTC) = 한국 시간 새벽 3시 10분에 실행한다. 마감일 당일 끝까지 받고, 다음 날 새벽에 닫는다.
--     (0025의 사용 기록 삭제가 18:00이라 겹치지 않게 10분 늦췄다.)
--   · 닫을 대상: 아직 안 닫혔고(closed_at 없음) 마감일(deadline_on)이 한국 시간 오늘보다 앞선 공고. 삭제 표시가 있는 공고도 닫아서 접수 지원이 남지 않게 한다.
--   · 하는 일은 안쪽 전용 함수 _close_project()(0031)가 한다. 운영자가 누르는 「모집 마감하기」와 같은 규칙이다
--     (공고 닫기 + 접수 지원 일괄 거절 + 「마감」 알림). 이미 닫힌 공고는 건너뛴다.
--   · 일정에는 로그인한 사람이 없으므로 운영자 확인 함수(close_project)를 부르지 않고 안쪽 함수를 직접 부른다.
--   · 들어낼 때: select cron.unschedule('close-expired-projects');

create extension if not exists pg_cron;
select cron.schedule(
  'close-expired-projects',
  '10 18 * * *',
  $$select public._close_project(id) from public.projects where closed_at is null and deadline_on < public.kst_today()$$
);
