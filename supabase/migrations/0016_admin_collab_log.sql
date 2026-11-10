-- 운영자 화면: 협업 신청이 「누가 누구에게, 언제, 어떤 상태로」 오갔는지의 기록(collab_log)을 따로 남긴다.
-- Supabase 화면의 SQL Editor에서 0015 다음에 실행한다. 기존 신청 데이터는 지우지 않고, 여러 번 실행해도 안전하다.
-- (이 SQL은 실행만 하면 기존 화면에 아무 영향이 없다. 코드는 이 SQL이 없으면 운영자 화면에서 「0016 필요」 안내만 보여 준다.)
-- 기준 문서: 프로젝트 문서 「운영자화면_계획」 결정 1~9 (2026-11-10~11 별뜨리님 지시).
--
-- 규칙 요약
--   · 기록에는 내용(아이디어)·연락처·SNS·포트폴리오 주소·첨부·답장 글을 담지 않는다. 신청자 이름, 받는 사람, 대상, 역할, 상태, 시각만 담는다.
--   · 신청을 받은 사람이 신청을 지워도 기록은 남는다(request_deleted_at만 찍힌다). 아래 4번이 지우는 순간을 DB가 직접 알아챈다.
--   · 운영자 표시(admins)가 있는 계정만 기록을 읽는다. 앱은 기록을 직접 쓰지 못한다(쓰기 정책 없음). 기록은 트리거만 쓴다.
--   · 운영자가 목록에서 「삭제」하면 기록은 지우지 않고 hidden_at만 찍어 목록에서 치운다(지표에는 계속 센다).
--   · 3개월 자동 삭제: 기록에도 같은 3개월 기준을 적용한다(lib/cleanup.ts). ※ 개인정보 보관 기간이라 확인이 필요하다.

-- 1) 기록 표 ----------------------------------------------------------------------------------
create table if not exists public.collab_log (
  request_id         uuid primary key,                     -- 신청 번호(신청이 지워져도 남도록 참조 연결은 걸지 않는다)
  created_at         timestamptz not null,                 -- 접수 시각
  recipient_kind     text not null check (recipient_kind in ('arklings', 'user')),
  recipient_id       uuid references auth.users(id) on delete set null,
  recipient_name     text not null,                        -- 접수 순간의 받는 사람 이름(아클링스 또는 공개 이름)
  applicant_name     text not null,
  target_kind        text not null check (target_kind in ('plan', 'work', 'creator', 'general')),
  target_text        text not null,                        -- 접수 순간의 대상 글자(기획안·작품 제목 등)
  roles              text[] not null default '{}',
  status             text not null check (status in ('received', 'reviewing', 'accepted', 'rejected')),
  status_changed_at  timestamptz,                          -- 상태가 마지막으로 바뀐 시각(접수 상태 그대로면 비어 있다)
  first_response_at  timestamptz,                          -- 처음 응답한 시각(상태가 접수에서 벗어난 때 또는 첫 답장)
  reply_count        integer not null default 0,
  request_deleted_at timestamptz,                          -- 받는 사람이 신청을 지운 시각
  hidden_at          timestamptz                           -- 운영자가 목록에서 치운 시각
);

create index if not exists collab_log_created_idx on public.collab_log (created_at desc);
create index if not exists collab_log_status_idx on public.collab_log (status);
create index if not exists collab_log_recipient_idx on public.collab_log (recipient_kind, recipient_name);

alter table public.collab_log enable row level security;

drop policy if exists "collab log admin select" on public.collab_log;
create policy "collab log admin select" on public.collab_log
  for select to authenticated
  using ((select public.is_admin()));
-- 쓰기(insert·update·delete) 정책은 만들지 않는다 → 앱이 직접 쓰지 못하고, 아래 트리거와 함수만 쓴다.

-- 2) 대상 글자 만들기(기획안 → 작품 → 크리에이터 → 일반 순서) ----------------------------------------
create or replace function public.collab_log_target(p_plan uuid, p_work_title text, p_handle text, p_source uuid)
returns table (kind text, label text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_plan is not null then
    return query select 'plan'::text, '기획안 「' || coalesce((select title from public.plans where id = p_plan), '제목 없음') || '」';
  elsif p_work_title is not null then
    return query select 'work'::text, '「' || p_work_title || '」';
  elsif p_handle is not null then
    return query select 'creator'::text, p_handle;
  else
    return query select 'general'::text, coalesce((select title from public.source_works where id = p_source), '전체 협업 제안');
  end if;
end $$;
revoke all on function public.collab_log_target(uuid, text, text, uuid) from public, anon, authenticated;

-- 3) 신청이 들어오면 기록을 만든다 ---------------------------------------------------------------
create or replace function public.collab_log_on_insert() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
begin
  select * into t from public.collab_log_target(new.plan_id, new.work_title, new.creator_handle, new.source_work_id);
  insert into public.collab_log (request_id, created_at, recipient_kind, recipient_id, recipient_name, applicant_name,
                                 target_kind, target_text, roles, status)
  values (
    new.id, new.created_at, new.recipient_kind, new.recipient_id,
    case when new.recipient_kind = 'arklings' then '아클링스'
         else coalesce((select display_name from public.profiles where id = new.recipient_id), '회원') end,
    new.applicant_name, t.kind, t.label, new.roles, new.status
  )
  on conflict (request_id) do nothing;
  return new;
end $$;

drop trigger if exists collab_log_insert on public.collab_requests;
create trigger collab_log_insert
  after insert on public.collab_requests
  for each row execute function public.collab_log_on_insert();

-- 4) 신청이 바뀌거나 지워질 때 기록을 맞춘다 -------------------------------------------------------
create or replace function public.collab_log_on_update() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.collab_log
     set applicant_name    = new.applicant_name,
         roles             = new.roles,
         status            = new.status,
         status_changed_at = case when new.status is distinct from old.status then now() else status_changed_at end,
         first_response_at = case when new.status is distinct from old.status and new.status <> 'received'
                                  then coalesce(first_response_at, now()) else first_response_at end
   where request_id = new.id;
  return new;
end $$;

drop trigger if exists collab_log_update on public.collab_requests;
create trigger collab_log_update
  after update on public.collab_requests
  for each row execute function public.collab_log_on_update();

create or replace function public.collab_log_on_delete() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.collab_log set request_deleted_at = coalesce(request_deleted_at, now()) where request_id = old.id;
  return old;
end $$;

drop trigger if exists collab_log_delete on public.collab_requests;
create trigger collab_log_delete
  after delete on public.collab_requests
  for each row execute function public.collab_log_on_delete();

-- 5) 답장이 남으면 답장 수와 첫 응답 시각을 맞춘다 -------------------------------------------------
create or replace function public.collab_log_on_reply() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.collab_log
     set reply_count = reply_count + 1,
         first_response_at = coalesce(first_response_at, now())
   where request_id = new.request_id;
  return new;
end $$;

drop trigger if exists collab_log_reply on public.collab_replies;
create trigger collab_log_reply
  after insert on public.collab_replies
  for each row execute function public.collab_log_on_reply();

-- 6) 운영자가 목록에서 치우기(기록은 남기고 숨김 표시만) -----------------------------------------------
create or replace function public.admin_hide_collab_log(p_ids uuid[]) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not (select public.is_admin()) or not (select public.is_email_confirmed()) then
    raise exception 'not_allowed';
  end if;
  update public.collab_log set hidden_at = coalesce(hidden_at, now()) where request_id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.admin_hide_collab_log(uuid[]) from public, anon;
grant execute on function public.admin_hide_collab_log(uuid[]) to authenticated;

-- 7) 이미 있는 신청으로 기록을 한 번 채운다(여러 번 실행해도 같은 신청은 한 번만 들어간다) ----------------
--    상태 바뀐 시각은 알 수 없어, 접수가 아닌 신청은 마지막으로 고친 시각(updated_at)으로 어림한다.
insert into public.collab_log (request_id, created_at, recipient_kind, recipient_id, recipient_name, applicant_name,
                               target_kind, target_text, roles, status, status_changed_at, first_response_at, reply_count)
select r.id, r.created_at, r.recipient_kind, r.recipient_id,
       case when r.recipient_kind = 'arklings' then '아클링스' else coalesce(p.display_name, '회원') end,
       r.applicant_name, t.kind, t.label, r.roles, r.status,
       case when r.status <> 'received' then r.updated_at end,
       least(case when r.status <> 'received' then r.updated_at end,
             (select min(cr.created_at) from public.collab_replies cr where cr.request_id = r.id)),
       (select count(*) from public.collab_replies cr where cr.request_id = r.id)
  from public.collab_requests r
  left join public.profiles p on p.id = r.recipient_id
  cross join lateral public.collab_log_target(r.plan_id, r.work_title, r.creator_handle, r.source_work_id) t
on conflict (request_id) do nothing;
