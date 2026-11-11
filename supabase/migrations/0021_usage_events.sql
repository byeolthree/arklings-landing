-- 사용 기록: 운영자가 랜딩·기획안 화면이 어떻게 쓰이는지 데이터로 볼 수 있게, 정해진 행동만 usage_events에 남긴다.
-- Supabase 화면의 SQL Editor에서 0020 다음에 실행한다. 기존 표·데이터는 건드리지 않고, 여러 번 실행해도 안전하다.
-- (이 SQL은 실행만 하면 기존 화면에 아무 영향이 없다. 기록하는 코드는 이 SQL이 없으면 조용히 건너뛴다.)
-- 이 SQL은 0003의 is_admin()을 쓴다(0003이 먼저 실행되어 있어야 한다).
--
-- 규칙 요약
--   · 기록하는 것은 「행동의 종류·시각·화면 경로·작은 부가 값」뿐이다. 글 내용·이메일·이름·연락처는 기록하지 않는다.
--   · 행동 종류는 허용 목록(아래 1번 check와 3번 함수)에 있는 것만 받는다. 새 행동을 더할 때는 새 번호의 SQL로 두 곳을 함께 고친다.
--     허용 목록: planner_open(기획안 화면 열기), plan_save(저장), ai_evaluate_click(AI 평가 누르기), library_ask(라이브러리 질문),
--               portfolio_start_click(포트폴리오 작성하기 누르기), signup(가입), login(로그인)
--   · 부가 값(props)은 작은 JSON 객체(키 5개 이하, 값은 짧은 글·숫자·참거짓, 전체 512바이트 미만)만 받는다.
--   · 읽기는 운영자(is_admin())만 한다. 앱은 표를 직접 쓰지 못한다(쓰기 정책 없음). 쓰기는 아래 record_usage_event 함수 하나로만 들어온다.
--   · 로그인한 사람의 행동이면 user_id를 DB가 auth.uid()로 채운다(앱이 보낸 값을 믿지 않는다). 로그인하지 않았으면 비운다.
--     회원이 탈퇴하면 user_id만 비워지고 기록은 남는다(누구인지 알 수 없게 된다).
--   · anon_id는 브라우저가 만든 무작위 값이다(개인정보처리방침에 고지). 이메일·이름과 연결되는 값이 아니다.
--   · 한 사람(브라우저 또는 회원)이 1분에 60건을 넘게 보내면 함수가 받지 않는다(남용 방지).
--   · 보관 기간은 아직 정해지지 않았다. 그래서 자동으로 지우는 일은 만들지 않았다(정해지면 새 번호의 SQL과 정리 작업으로 더한다).
--   · 서버 전용 열쇠는 쓰지 않는다. 함수는 로그인 없이도(anon) 부를 수 있어야 해서 anon·authenticated에 열려 있다.
--     그래서 서버 경로(/api/events) 밖에서 직접 불러도 위의 허용 목록·크기·분당 한도가 DB에서 한 번 더 막는다.

-- 1) 기록 표 ----------------------------------------------------------------------------------
create table if not exists public.usage_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users(id) on delete set null,   -- 로그인하지 않았으면 비움
  anon_id     text check (anon_id is null or anon_id ~ '^[A-Za-z0-9_-]{16,64}$'),  -- 브라우저가 만든 무작위 값
  event       text not null check (event in ('planner_open', 'plan_save', 'ai_evaluate_click', 'library_ask', 'portfolio_start_click', 'signup', 'login')),
  page        text check (page is null or (char_length(page) <= 100 and page ~ '^/')),  -- 화면 경로(? 뒤 값은 받지 않는다)
  props       jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object' and pg_column_size(props) < 512)
  -- 누구의 행동인지(user_id 또는 anon_id가 있어야 함)는 아래 함수가 넣을 때 확인한다. 표의 제약으로 두지 않는 이유:
  -- 회원이 탈퇴하면 user_id가 비워지는데, 그때 제약에 걸려 탈퇴가 막히면 안 되기 때문이다.
);

create index if not exists usage_events_created_idx on public.usage_events (created_at desc);
create index if not exists usage_events_event_idx on public.usage_events (event, created_at desc);
create index if not exists usage_events_anon_idx on public.usage_events (anon_id, created_at desc) where anon_id is not null;
create index if not exists usage_events_user_idx on public.usage_events (user_id, created_at desc) where user_id is not null;

-- 2) 접근 규칙: 읽기는 운영자만, 쓰기 정책은 만들지 않는다 -------------------------------------------
alter table public.usage_events enable row level security;

drop policy if exists "usage events read admin" on public.usage_events;
create policy "usage events read admin" on public.usage_events
  for select to authenticated
  using ((select public.is_admin()));

-- 3) 기록하는 함수(유일한 쓰기 길). 허용 목록·크기·분당 한도를 여기서 확인한다 ------------------------------
create or replace function public.record_usage_event(p_anon_id text, p_event text, p_page text, p_props jsonb default '{}'::jsonb) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid       uuid := (select auth.uid());
  props     jsonb := coalesce(p_props, '{}'::jsonb);
  recent    integer;
  kv        record;
  n_keys    integer := 0;
begin
  -- 행동 종류: 허용 목록에 있는 것만
  if p_event is null or p_event not in ('planner_open', 'plan_save', 'ai_evaluate_click', 'library_ask', 'portfolio_start_click', 'signup', 'login') then
    return false;
  end if;
  -- 누구의 행동인지: 로그인했거나, 브라우저 무작위 값이 있어야 한다
  if p_anon_id is not null and p_anon_id !~ '^[A-Za-z0-9_-]{16,64}$' then return false; end if;
  if uid is null and p_anon_id is null then return false; end if;
  -- 화면 경로
  if p_page is not null and (char_length(p_page) > 100 or p_page !~ '^/[A-Za-z0-9/_.~%-]*$') then return false; end if;
  -- 부가 값: 작은 JSON 객체(키 5개 이하, 값은 짧은 글·숫자·참거짓)
  if jsonb_typeof(props) <> 'object' or pg_column_size(props) >= 512 then return false; end if;
  for kv in select key, value from jsonb_each(props) loop
    n_keys := n_keys + 1;
    if n_keys > 5 or char_length(kv.key) > 30 then return false; end if;
    if jsonb_typeof(kv.value) not in ('string', 'number', 'boolean') then return false; end if;
    if jsonb_typeof(kv.value) = 'string' and char_length(kv.value #>> '{}') > 40 then return false; end if;
  end loop;
  -- 남용 방지: 같은 브라우저 또는 같은 회원이 1분에 60건을 넘으면 받지 않는다
  select count(*) into recent
    from public.usage_events e
   where e.created_at > now() - interval '1 minute'
     and ((p_anon_id is not null and e.anon_id = p_anon_id) or (uid is not null and e.user_id = uid));
  if recent >= 60 then return false; end if;

  insert into public.usage_events (user_id, anon_id, event, page, props)
  values (uid, p_anon_id, p_event, p_page, props);
  return true;
end $$;

revoke all on function public.record_usage_event(text, text, text, jsonb) from public;
grant execute on function public.record_usage_event(text, text, text, jsonb) to anon, authenticated;
