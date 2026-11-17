-- 미션8(티켓 005): 사용 기록(0021)의 허용 목록에 새 행동 4개를 더한다.
--   plan_pdf_download(기획안 PDF 내려받기 성공), plan_mail_send(기획안 PDF 메일 받기 성공),
--   ai_evaluate_done(AI 평가 결과 받기), collab_submit(협업 신청 완료)
-- Supabase SQL Editor에서 0027 다음에 실행한다(실행은 아키텍터가 한다). 기존 데이터는 건드리지 않고, 여러 번 실행해도 안전하다.
-- 실행 전에는 새 행동 4개가 DB 기록에서만 조용히 거절된다(화면 동작에는 영향 없음). 실행하면 /admin/usage에 4개가 보이기 시작한다.
-- 허용 목록은 두 곳(표의 check, 함수)이고 lib/measure/events.ts와 같은 이름이어야 한다. 아래는 0021과 같은 규칙에 이름만 더한 것이다.

-- 1) 표의 허용 목록
alter table public.usage_events drop constraint if exists usage_events_event_check;
alter table public.usage_events add constraint usage_events_event_check check (
  event in (
    'planner_open', 'plan_save', 'ai_evaluate_click', 'library_ask', 'portfolio_start_click', 'signup', 'login',
    'plan_pdf_download', 'plan_mail_send', 'ai_evaluate_done', 'collab_submit'
  )
);

-- 2) 기록하는 함수(0021과 같고 허용 목록만 늘었다)
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
  if p_event is null or p_event not in (
    'planner_open', 'plan_save', 'ai_evaluate_click', 'library_ask', 'portfolio_start_click', 'signup', 'login',
    'plan_pdf_download', 'plan_mail_send', 'ai_evaluate_done', 'collab_submit'
  ) then
    return false;
  end if;
  if p_anon_id is not null and p_anon_id !~ '^[A-Za-z0-9_-]{16,64}$' then return false; end if;
  if uid is null and p_anon_id is null then return false; end if;
  if p_page is not null and (char_length(p_page) > 100 or p_page !~ '^/[A-Za-z0-9/_.~%-]*$') then return false; end if;
  if jsonb_typeof(props) <> 'object' or pg_column_size(props) >= 512 then return false; end if;
  for kv in select key, value from jsonb_each(props) loop
    n_keys := n_keys + 1;
    if n_keys > 5 or char_length(kv.key) > 30 then return false; end if;
    if jsonb_typeof(kv.value) not in ('string', 'number', 'boolean') then return false; end if;
    if jsonb_typeof(kv.value) = 'string' and char_length(kv.value #>> '{}') > 40 then return false; end if;
  end loop;
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
