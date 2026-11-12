-- 미션7-2 AI 기능: 「오늘 남은 ○번」을 읽는 길과 하루 한도를 한 곳에 두기. 0017 다음에 실행한다.
-- 기존 표·데이터는 건드리지 않고, 여러 번 실행해도 안전하다. (이 SQL은 0017의 함수 reserve_ai_use를 같은 동작으로 다시 만든다.)
-- 기준: docs/mission7-2-llm-plan.md P1·P2, 화면 시안의 「오늘 남은 평가 ○번」「오늘 남은 질문 ○번」.
--
-- 규칙 요약
--   · 하루 한도는 ai_daily_limit() 한 곳에만 둔다. 자리 잡기(reserve_ai_use)와 남은 횟수 읽기(ai_use_remaining)가 같은 숫자를 쓴다.
--     ※ 아래 5는 임시값이다(횟수 방식 확정 전, P1·O4). 크레딧 방식으로 바꾸면 이 함수와 남은 수를 읽는 함수를 새 번호의 SQL로 다시 만든다.
--   · 남은 횟수는 로그인한 본인 것만 읽는다(auth.uid()). 이메일 확인이 안 됐거나 모르는 기능이면 null.
--   · 사용량 표는 여전히 앱이 직접 읽지 못한다. 읽는 길은 이 함수 하나다.

create or replace function public.ai_daily_limit(p_feature text) returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_feature
    when 'evaluate_logline' then 5   -- 임시값(P1)
    when 'library_ask' then 5        -- 임시값(P1)
    else null
  end
$$;
revoke all on function public.ai_daily_limit(text) from public, anon, authenticated;

-- 자리 잡기: 0017과 같은 동작. 한도만 ai_daily_limit()에서 읽는다.
create or replace function public.reserve_ai_use(p_feature text, p_units integer default 1) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid         uuid := (select auth.uid());
  today       date := (now() at time zone 'Asia/Seoul')::date;
  daily_limit integer := public.ai_daily_limit(p_feature);
  got         integer;
  hold_id     uuid;
begin
  if uid is null then return null; end if;
  if not (select public.is_email_confirmed()) then return null; end if;
  if p_units is null or p_units < 1 or p_units > 10 then return null; end if;
  if daily_limit is null or p_units > daily_limit then return null; end if;

  insert into public.ai_usage as u (user_id, feature, day, calls, units)
  values (uid, p_feature, today, 1, p_units)
  on conflict (user_id, feature, day)
    do update set calls = u.calls + 1, units = u.units + p_units
    where u.units + p_units <= daily_limit
  returning 1 into got;
  if got is null then return null; end if;

  insert into public.ai_usage_holds (user_id, feature, day, units)
  values (uid, p_feature, today, p_units)
  returning id into hold_id;
  return hold_id;
end $$;
revoke all on function public.reserve_ai_use(text, integer) from public, anon;
grant execute on function public.reserve_ai_use(text, integer) to authenticated;

-- 오늘 남은 수. 로그인·이메일 확인이 안 됐거나 모르는 기능이면 null.
create or replace function public.ai_use_remaining(p_feature text) returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid         uuid := (select auth.uid());
  daily_limit integer := public.ai_daily_limit(p_feature);
  used        integer;
begin
  if uid is null or daily_limit is null then return null; end if;
  if not (select public.is_email_confirmed()) then return null; end if;
  select coalesce(sum(u.units), 0) into used
    from public.ai_usage u
   where u.user_id = uid and u.feature = p_feature and u.day = (now() at time zone 'Asia/Seoul')::date;
  return greatest(daily_limit - used, 0);
end $$;
revoke all on function public.ai_use_remaining(text) from public, anon;
grant execute on function public.ai_use_remaining(text) to authenticated;
