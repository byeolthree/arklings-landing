-- 팀미션 「AI 단가 분석」(공고 올리기·수정 화면의 「AI 단가 분석」 버튼): 새 AI 기능 이름 estimate_project를 DB가 받도록 한다. 0033 다음에 실행한다.
-- 기존 표·데이터는 건드리지 않고, 여러 번 실행해도 안전하다. (0024의 ai_daily_limit를 같은 이름으로 다시 만든다.)
-- 실행은 아키텍터(또는 계획 세션)가 Supabase SQL Editor에서 한다. 이 코드가 먼저 배포돼도 실행 전에는 「AI 단가 분석」이 「AI 연결에 문제가 있어요」로 안내될 뿐 다른 기능은 영향이 없다.
--
-- 왜 필요한가
--   · ai_usage.feature에 「evaluate_logline, library_ask만」이라는 검사(check)가 걸려 있어(0017) 새 기능 이름으로는 사용 횟수를 한 줄도 적을 수 없다.
--   · ai_daily_limit()(0024)도 모르는 기능 이름이면 null을 돌려줘 reserve_ai_use()가 자리를 주지 않는다.
--
-- 규칙 요약
--   · 새 기능 이름: estimate_project(AI 단가 분석). 사용 횟수는 AI 평가·라이브러리 질문과 따로 센다.
--   · 하루 한도는 기존과 같다: 일반 계정 10번, 운영자(is_admin()) 1000번. (AI 단가 분석은 운영자만 쓰는 기능이다.)
--   · 자리 잡기(reserve_ai_use)·남은 횟수(ai_use_remaining)·돌려주기(release_ai_use)는 바꾸지 않는다. 한도는 ai_daily_limit() 한 곳에서 읽는다.
--   · 사용 기록 표(ai_usage, ai_usage_holds)의 RLS·권한은 그대로다(앱이 직접 읽거나 쓰지 못한다).

-- 1) ai_usage.feature 검사에 estimate_project를 더한다.
--    이름이 달라도 지울 수 있도록, 기능 이름 목록이 적힌 검사를 정의로 찾아 지우고 새로 만든다.
do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.ai_usage'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%evaluate_logline%'
  loop
    execute format('alter table public.ai_usage drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.ai_usage
  add constraint ai_usage_feature_check
  check (feature in ('evaluate_logline', 'library_ask', 'estimate_project'));

-- 2) 하루 한도: 0024와 같은 값에 새 기능 이름만 더한다.
create or replace function public.ai_daily_limit(p_feature text) returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p_feature not in ('evaluate_logline', 'library_ask', 'estimate_project') then null
    when (select public.is_admin()) then 1000
    else 10
  end
$$;
revoke all on function public.ai_daily_limit(text) from public, anon, authenticated;

-- 실행 뒤 확인(읽기만):
--   select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.ai_usage'::regclass and contype = 'c';
--     → 「feature = ANY (ARRAY['evaluate_logline', 'library_ask', 'estimate_project'])」가 보여야 한다.
--   select pg_get_functiondef('public.ai_daily_limit(text)'::regprocedure);
--     → 목록에 estimate_project가 있고 「else 10」이 그대로여야 한다.
