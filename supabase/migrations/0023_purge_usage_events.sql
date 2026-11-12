-- 사용 기록 보관 기간 90일(아키텍터 결정 2026-11-11, 계획 문서 O8): 90일이 지난 usage_events 줄을 지우는 함수. 0021 다음에 실행한다.
-- 이 SQL은 함수만 만든다. 기존 표·데이터는 건드리지 않고, 여러 번 실행해도 안전하다. 자동으로 돌리는 스케줄은 만들지 않았다.
-- 쓰는 법: 운영자 계정으로 로그인한 연결에서 select public.purge_usage_events(); (지운 줄 수를 돌려준다)
--
-- 규칙 요약
--   · 지우는 기준은 created_at이 지금부터 90일 이전인 줄이다.
--   · 운영자(is_admin(), 0003)만 부를 수 있다. 함수 안에서도 한 번 더 확인하고, 운영자가 아니면 아무것도 지우지 않고 오류를 낸다.
--   · usage_events에는 지우기 정책이 없어 앱이 직접 지울 수 없다. 이 함수만 표 주인 권한(security definer)으로 지운다.
--   · 서버 전용 열쇠는 쓰지 않는다.

create or replace function public.purge_usage_events() returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not (select public.is_admin()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  delete from public.usage_events where created_at < now() - interval '90 days';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.purge_usage_events() from public, anon;
grant execute on function public.purge_usage_events() to authenticated;
