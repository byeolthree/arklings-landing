-- 미션7-2 AI 기능: 일반 사용자의 하루 한도를 5에서 10으로 올린다. 0023 다음에 실행한다.
-- 아키텍터가 2026-11-11에 정했다(계획 문서 O4: 기능마다 하루 10번). 운영 Supabase(arklings-seoul)에는 계획 세션이 같은 내용으로 이미 실행했다(실행 뒤 함수 본문이 「else 10 end」인 것까지 확인). 이 파일은 새 환경이 같은 상태가 되도록 남기는 기록이다.
-- 기존 표·데이터는 건드리지 않고, 여러 번 실행해도 안전하다. (0022의 ai_daily_limit를 같은 이름으로 다시 만든다.)
--
-- 규칙 요약
--   · 일반 계정은 기능(evaluate_logline, library_ask)마다 하루 10번. 운영자(is_admin())는 그대로 1000.
--   · 자리 잡기(reserve_ai_use)와 남은 횟수 읽기(ai_use_remaining)는 이 함수 하나를 쓰므로 다른 코드는 바꾸지 않는다.

create or replace function public.ai_daily_limit(p_feature text) returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p_feature not in ('evaluate_logline', 'library_ask') then null
    when (select public.is_admin()) then 1000
    else 10
  end
$$;
revoke all on function public.ai_daily_limit(text) from public, anon, authenticated;
