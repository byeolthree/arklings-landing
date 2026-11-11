-- 미션7-2 AI 기능: 운영자 계정은 하루 한도를 크게 푼다. 0020 다음에 실행한다.
-- 이미 운영 Supabase(arklings-seoul)에서 계획 세션이 같은 내용으로 실행해 두었다. 이 파일은 새 환경을 만들 때 같은 상태가 되도록 남기는 기록이다.
-- 기존 표·데이터는 건드리지 않고, 여러 번 실행해도 안전하다. (0020의 ai_daily_limit를 같은 이름으로 다시 만든다.)
--
-- 규칙 요약
--   · 아키텍터가 정한 것은 「운영자 계정은 제한을 푼다」뿐이다. 1000이라는 숫자는 계획 세션이 정했다.
--   · 운영자 여부는 is_admin()(0003)으로 읽는다. 일반 계정은 지금처럼 5(임시값, P1·O4).
--   · 자리 잡기(reserve_ai_use)와 남은 횟수 읽기(ai_use_remaining)는 그대로 이 함수 하나를 쓴다.
--   · 0020은 immutable이었으나 is_admin()이 호출한 사람에 따라 달라지므로 이번에는 stable로 둔다.

create or replace function public.ai_daily_limit(p_feature text) returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p_feature not in ('evaluate_logline', 'library_ask') then null
    when (select public.is_admin()) then 1000
    else 5
  end
$$;
revoke all on function public.ai_daily_limit(text) from public, anon, authenticated;
