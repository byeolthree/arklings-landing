-- 미션7-2 AI 기능: 하루 사용 횟수 제한(한국 날짜 기준). 평가와 라이브러리 질문을 기능별로 따로 센다.
-- Supabase 화면의 SQL Editor에서 0016 다음에 실행한다. 기존 표·데이터는 건드리지 않고, 여러 번 실행해도 안전하다.
-- (이 SQL은 실행만 하면 기존 화면에 아무 영향이 없다. AI 기능 코드는 이 SQL이 없으면 호출 전에 멈춘다.)
-- 기준 문서: docs/mission7-2-llm-plan.md 8장·P1·P2, 교재 10-3 「동시에 요청하면 한도가 새는 이유」.
-- 이 SQL은 0007의 is_email_confirmed()를 쓴다(0007이 먼저 실행되어 있어야 한다).
--
-- 규칙 요약
--   · 사용량 표는 앱이 직접 읽거나 고치지 못한다(정책 없이 RLS만 켠다). 아래 두 함수로만 센다.
--   · 하루 한도는 이 함수 안에 기능별 상수로 둔다. 화면·서버가 한도를 인자로 보내지 못한다.
--     ※ 아래 5번은 임시값이다(P1, O4). 호출 비용을 잰 뒤 아키텍터가 정하고, 바꿀 때는 이 함수만 새 번호의 SQL로 다시 만든다.
--   · 「확인과 증가」를 한 번에 처리한다(원자적). 남은 한 자리를 먼저 잡은 요청만 통과한다.
--   · 소비 단위(units)를 따로 둔다(P2). 지금은 호출 1회 = 1단위이고, 나중에 크레딧 방식으로 바꿔도 한도 숫자만 바꾸면 된다.
--   · 자리를 잡으면 「자리표(uuid)」를 돌려준다. 돌려주기는 그 자리표를 가진 쪽만 한 번 할 수 있다.
--     (메일 횟수 함수처럼 자리표 없이 돌려주기를 열어 두면, 로그인한 사람이 돌려주기만 반복해 한도를 풀 수 있다.)
--   · 기능 이름: evaluate_logline(AI 평가), library_ask(라이브러리 질문). 새 기능은 아래 5번의 상수에 한 줄 더한다.
--   · 서버 전용 열쇠는 쓰지 않는다(AGENTS.md 규칙 4). 함수는 로그인한 본인의 권한(auth.uid())으로만 동작한다.

-- 1) 날짜·기능별 합계 -----------------------------------------------------------------------
create table if not exists public.ai_usage (
  user_id  uuid    not null references auth.users(id) on delete cascade,
  feature  text    not null check (feature in ('evaluate_logline', 'library_ask')),
  day      date    not null,                                   -- 한국 날짜
  calls    integer not null default 0 check (calls >= 0),      -- 잡은 자리 수(돌려준 것은 뺀다)
  units    integer not null default 0 check (units between 0 and 1000), -- 소비 단위 합계
  primary key (user_id, feature, day)
);
alter table public.ai_usage enable row level security;
-- 정책을 만들지 않는다 → 로그인한 사용자도 이 표를 직접 읽거나 고칠 수 없다.

-- 2) 자리표(한 번의 호출 = 한 줄). 돌려주기가 이 줄을 확인한다 ---------------------------------
create table if not exists public.ai_usage_holds (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  feature     text not null,
  day         date not null,
  units       integer not null check (units between 1 and 10),
  created_at  timestamptz not null default now(),
  released_at timestamptz                                     -- 돌려준 시각(비어 있으면 아직 쓴 자리)
);
alter table public.ai_usage_holds enable row level security;
-- 정책을 만들지 않는다. 오래된 줄은 정리 작업이 지운다(서버 단계에서 lib/cleanup.ts에 더한다).
create index if not exists ai_usage_holds_created_idx on public.ai_usage_holds (created_at);

-- 3) 자리를 하나 잡는다. 한도가 찼거나 로그인·이메일 확인이 안 됐으면 null.
--    모델을 부르기 전에 부르고, 호출이 실패하면 release_ai_use로 돌려 놓는다.
create or replace function public.reserve_ai_use(p_feature text, p_units integer default 1) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid         uuid := (select auth.uid());
  today       date := (now() at time zone 'Asia/Seoul')::date;
  daily_limit integer;
  got         integer;
  hold_id     uuid;
begin
  if uid is null then return null; end if;
  if not (select public.is_email_confirmed()) then return null; end if;
  if p_units is null or p_units < 1 or p_units > 10 then return null; end if;

  -- 5) 하루 한도 (임시값 5, P1·O4). 기능별로 따로 센다.
  daily_limit := case p_feature
    when 'evaluate_logline' then 5
    when 'library_ask' then 5
    else null
  end;
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

-- 4) 자리를 돌려준다. 자리표를 가진 본인이 한 번만 돌려줄 수 있다. 돌려줬으면 true.
create or replace function public.release_ai_use(p_hold uuid) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  h   record;
begin
  if uid is null or p_hold is null then return false; end if;
  update public.ai_usage_holds
     set released_at = now()
   where id = p_hold and user_id = uid and released_at is null
  returning feature, day, units into h;
  if not found then return false; end if;
  update public.ai_usage
     set calls = greatest(calls - 1, 0), units = greatest(units - h.units, 0)
   where user_id = uid and feature = h.feature and day = h.day;
  return true;
end $$;

revoke all on function public.reserve_ai_use(text, integer) from public, anon;
revoke all on function public.release_ai_use(uuid) from public, anon;
grant execute on function public.reserve_ai_use(text, integer) to authenticated;
grant execute on function public.release_ai_use(uuid) to authenticated;
