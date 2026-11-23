-- 프로젝트(외주 매칭) 2단계 ④: 알림 표 notifications(+읽음 처리 함수)와 북마크 표 project_bookmarks.
-- Supabase 화면의 SQL Editor에서 0031 다음에 실행한다. 기존 데이터는 지우지 않고, 여러 번 실행해도 안전하다.
--
-- 규칙 요약 (알림)
--   · 알림은 받는 사람 본인만 읽는다. 브라우저(로그인한 사용자)는 알림을 직접 넣거나 고치거나 지울 수 없다.
--     알림을 넣는 길은 안쪽 전용 함수 _notify() 하나뿐이고, 0031의 처리 함수와 예약 실행 안에서만 불린다.
--   · 읽음 처리는 mark_notifications_read() 함수로만 한다(본인 알림만, 번호 목록을 주면 그것만, 안 주면 안 읽은 것 전부).
--   · 알림 종류 5가지: project_new_application(새 지원, 공고를 올린 운영자에게), project_accepted(수락), project_auto_rejected(자동 거절),
--     project_rejected(직접 거절), project_closed(마감, 접수 상태였던 지원자 전원에게).
--   · 이동 주소(href)는 이 사이트 안 경로만 허용한다. 문구에는 공고 제목과(새 지원일 때) 지원자 공개 이름이 들어간다. 연락처·이메일은 담지 않는다.
--   · 받는 사람이 탈퇴하면 알림도 연쇄 삭제된다. ※ 알림의 보관 기간은 아직 정하지 않았다(개인정보라 확인이 필요하다).
--
-- 규칙 요약 (북마크)
--   · 본인 것만 읽고 넣고 지운다. 이메일 확인을 마친 계정만 넣을 수 있다(프로젝트의 다른 쓰기와 같은 규칙).
--   · 공고가 지워지면(줄이 실제로 지워질 일은 없지만) 북마크도 함께 지워진다. 소프트 삭제된 공고의 북마크는 남는다.
--
-- 이 파일이 쓰는 것: public.projects(0029), public.is_email_confirmed()(0007).

-- 1) 알림 표 ---------------------------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,   -- 받는 사람
  kind        text not null,
  href        text not null,                                               -- 누르면 가는 곳(이 사이트 안 경로)
  body        text not null,                                               -- 알림 문구
  read_at     timestamptz,                                                 -- 읽은 시각(비어 있으면 안 읽음)
  created_at  timestamptz not null default now()
);

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('project_new_application', 'project_accepted', 'project_auto_rejected', 'project_rejected', 'project_closed'));
alter table public.notifications drop constraint if exists notifications_href_check;
alter table public.notifications add constraint notifications_href_check
  check (char_length(href) between 1 and 200 and href ~ '^/([A-Za-z0-9_?=&#.%-][A-Za-z0-9/_?=&#.%-]*)?$');   -- 「/」로 시작하되 「//」(다른 사이트 주소)는 막는다
alter table public.notifications drop constraint if exists notifications_body_check;
alter table public.notifications add constraint notifications_body_check
  check (char_length(body) between 1 and 200 and body !~ '[\u0001-\u001f\u007f<>]');

create index if not exists notifications_user_idx   on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;          -- 쓰기 권한은 주지 않는다

drop policy if exists "notifications read own" on public.notifications;
create policy "notifications read own" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 2) 알림을 넣는 안쪽 전용 함수(0031의 처리 함수가 부른다). 받는 사람이 없으면(예: 올린 운영자 계정이 지워짐) 조용히 넘어간다. ----------------
create or replace function public._notify(p_user uuid, p_kind text, p_href text, p_body text) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null then
    return;
  end if;
  insert into public.notifications (user_id, kind, href, body)
  values (p_user, p_kind, p_href, left(p_body, 200));
end;
$$;
revoke all on function public._notify(uuid, text, text, text) from public, anon, authenticated;

-- 3) 읽음 처리: 본인 알림만. 번호 목록을 주면 그것만, 안 주면(null) 안 읽은 알림 전부. 읽음 처리한 개수를 돌려준다. ------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_n   integer;
begin
  if v_uid is null then
    raise exception 'not_logged_in' using errcode = '28000';
  end if;
  update public.notifications
     set read_at = now()
   where user_id = v_uid and read_at is null and (p_ids is null or id = any(p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon, authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- 4) 북마크 표 ---------------------------------------------------------------------------------------------
create table if not exists public.project_bookmarks (
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index if not exists project_bookmarks_project_idx on public.project_bookmarks (project_id);

alter table public.project_bookmarks enable row level security;

revoke all on public.project_bookmarks from anon, authenticated;
grant select, insert, delete on public.project_bookmarks to authenticated;

drop policy if exists "project_bookmarks read own" on public.project_bookmarks;
create policy "project_bookmarks read own" on public.project_bookmarks
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "project_bookmarks insert own" on public.project_bookmarks;
create policy "project_bookmarks insert own" on public.project_bookmarks
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_email_confirmed()));

drop policy if exists "project_bookmarks delete own" on public.project_bookmarks;
create policy "project_bookmarks delete own" on public.project_bookmarks
  for delete to authenticated
  using (user_id = (select auth.uid()));
