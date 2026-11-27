-- 팀미션 공고 3.3 「실시간 알림」: 새 알림이 생기면 새로고침 없이 상단 종 개수가 바뀌게 한다.
-- 0035 다음에 arklings-landing DB에서 실행한다. 표·데이터는 바꾸지 않고, 여러 번 실행해도 안전하다.
--
-- 하는 일: Supabase 실시간 전송 목록(supabase_realtime)에 notifications 표를 더한다.
-- 누가 무엇을 받나: 실시간 전송도 표의 읽기 규칙(RLS)을 그대로 따른다. 0032의 「본인 알림만 읽기」 규칙 때문에
--   로그인한 사람은 자기 알림이 생길 때만 신호를 받는다. 로그인하지 않은 사람(anon)은 이 표를 읽을 권한이 없어 받지 못한다.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- 실행 뒤 확인(읽기만):
--   select tablename from pg_publication_tables where pubname = 'supabase_realtime';
--     → notifications가 보여야 한다.
