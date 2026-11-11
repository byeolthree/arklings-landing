-- 사용 기록 90일 자동 삭제 일정(아키텍터 결정 2026-11-11 O8, 일정 설정은 2026-11-12 승인). 0023 다음에 실행한다.
-- 운영 Supabase(arklings-seoul)에는 계획 세션이 같은 내용으로 이미 실행했다(cron.job에 purge-usage-events, 0 18 * * *, 켜짐 확인). 이 파일은 새 환경이 같은 상태가 되도록 남기는 기록이다.
-- 여러 번 실행해도 안전하다(같은 이름의 일정은 덮어쓴다).
--
-- 규칙 요약
--   · 매일 18:00(UTC) = 한국 시간 새벽 3시에 90일이 지난 usage_events 줄을 지운다.
--   · 일정은 purge_usage_events()를 부르지 않고 같은 삭제문을 직접 실행한다. 그 함수는 운영자 로그인을 확인하는데 일정에는 로그인한 사람이 없기 때문이다. 운영자가 손으로 지울 때만 그 함수를 쓴다.
--   · 들어낼 때: select cron.unschedule('purge-usage-events'); (docs/measure-removal.md)

create extension if not exists pg_cron;
select cron.schedule('purge-usage-events', '0 18 * * *', $$delete from public.usage_events where created_at < now() - interval '90 days'$$);
