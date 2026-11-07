-- 미션7 크리에이터: 채널 링크를 「지우고 다시 넣기」가 아니라 한 번에(한 트랜잭션) 바꾼다.
-- Supabase 화면의 SQL Editor에서 0010 다음(또는 0009 다음)에 실행한다. 여러 번 실행해도 안전하다. 실행 전에는 채널 링크 저장이 안 된다.
--
-- 규칙 요약
--   · 호출한 사람(로그인한 본인)의 권한(RLS)으로 실행된다(security invoker). 남의 채널은 건드릴 수 없다.
--   · 함수 하나가 한 트랜잭션이라, 중간에 실패(5개 초과, 주소 모양 오류 등)하면 원래 채널이 그대로 남는다.
--   · 입력은 [{"label": "...", "url": "https://..."}] 모양의 목록이고 순서가 곧 position이다. 글자 수·https·5개 한도는 표의 검사와 트리거가 그대로 막는다.

create or replace function public.replace_creator_channels(p_channels jsonb) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_channels is null or jsonb_typeof(p_channels) <> 'array' then
    raise exception 'invalid_channels';
  end if;

  delete from public.creator_channels where user_id = v_uid;

  insert into public.creator_channels (user_id, label, url, position)
  select v_uid, c ->> 'label', c ->> 'url', (t.ord - 1)::int
    from jsonb_array_elements(p_channels) with ordinality as t(c, ord);
end $$;

revoke all on function public.replace_creator_channels(jsonb) from public, anon;
grant execute on function public.replace_creator_channels(jsonb) to authenticated;
