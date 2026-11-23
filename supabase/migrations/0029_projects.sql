-- 프로젝트(외주 매칭) 2단계 ①: 공고 표 projects.
-- Supabase 화면의 SQL Editor에서 0028 다음에 실행한다. 기존 데이터는 지우지 않고, 여러 번 실행해도 안전하다.
-- 이 SQL만 실행해서는 화면이 달라지지 않는다. 화면·처리 코드는 0029~0033을 모두 실행했다고 아키텍터가 말한 뒤에 연결한다.
-- 기준: 아키텍터 지시 2026-11-23(프로젝트 2단계), 화면 계약 docs/screen-contract.md 「프로젝트 모집」.
--
-- 규칙 요약
--   · 읽기: 누구나(로그인 없이도). 삭제 표시(deleted_at)가 찍힌 공고는 운영자만 본다.
--   · 쓰기: 운영자(is_admin(), 0003)만. 올리기는 운영자 본인 이름(posted_by)으로만 되고, 이메일 확인을 마친 계정이어야 한다(is_email_confirmed(), 0007).
--     지우기는 줄을 지우지 않고 deleted_at만 찍는다(소프트 삭제). 표에 지우기 권한을 주지 않는다.
--   · 모집 마감 시각(closed_at)은 처리 함수(0031)와 예약 실행(0033)만 바꾼다. 운영자가 표를 직접 고쳐서 바꾸면 막는다
--     (마감된 공고에는 접수 상태의 지원이 남지 않는다는 규칙을 지키기 위해서다).
--   · 「모집 중·예정·마감」 상태는 칸으로 저장하지 않고 날짜와 closed_at에서 계산한다(0030의 보기 projects_public).
--   · 보상(만 원)은 둘 다 비우면 「협의」다.
--   · 눈여겨볼 점: posted_by(올린 운영자 번호)는 표를 직접 읽으면 보인다. 화면은 posted_by가 없는 보기 projects_public(0030)을 읽는다.
--
-- 이 파일이 쓰는 것: public.set_updated_at()(0002), public.is_admin()(0003), public.is_email_confirmed()(0007), public.source_works(schema.sql).

-- 1) 한국 시간 오늘 날짜(마감·모집 시작 판단과 예약 실행이 같이 쓴다) ---------------------------------
create or replace function public.kst_today() returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Seoul')::date;
$$;

-- 2) 공고 표 ---------------------------------------------------------------------------------------
create table if not exists public.projects (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  summary         text not null,                                  -- 카드에 보이는 한 줄 요약
  description     text not null default '',                       -- 소개 글(상세의 「하는 일」)
  roles           text[] not null,                                -- 찾는 역할(맨 앞이 대표). 기존 6종만
  genres          text[] not null default '{}',                   -- 장르 이름 목록은 앱이 정한다
  reward_min      integer,                                        -- 만 원. 둘 다 비우면 협의
  reward_max      integer,
  opens_on        date not null,                                  -- 모집 시작일
  deadline_on     date not null,                                  -- 모집 마감일(그날 끝까지 받는다)
  work_starts_on  date,                                           -- 작업 기간(선택)
  work_ends_on    date,
  source          text not null,                                  -- arklings = 아클링스 추진, request = 협업 의뢰
  source_work_id  uuid references public.source_works(id) on delete set null,   -- 연결 작품(선택)
  posted_by       uuid references auth.users(id) on delete set null,            -- 올린 운영자
  closed_at       timestamptz,                                    -- 모집을 닫은 시각(수락·직접 마감·마감일 지남). 함수만 바꾼다
  deleted_at      timestamptz,                                    -- 소프트 삭제
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 규칙(검사): 이름을 붙여 두고 지웠다 다시 만들어, 여러 번 실행해도 같은 상태가 된다.
alter table public.projects drop constraint if exists projects_title_check;
alter table public.projects add constraint projects_title_check
  check (char_length(title) between 2 and 60 and title !~ '[\u0001-\u001f\u007f<>]');
alter table public.projects drop constraint if exists projects_summary_check;
alter table public.projects add constraint projects_summary_check
  check (char_length(summary) between 10 and 120 and summary !~ '[\u0001-\u001f\u007f<>]');
alter table public.projects drop constraint if exists projects_description_check;
alter table public.projects add constraint projects_description_check
  check (char_length(description) <= 3000 and description !~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f<>]');
alter table public.projects drop constraint if exists projects_roles_check;
alter table public.projects add constraint projects_roles_check
  check (cardinality(roles) between 1 and 6
         and roles <@ array['video','script','art_director','history_advisor','producer','other']::text[]);
alter table public.projects drop constraint if exists projects_genres_check;
alter table public.projects add constraint projects_genres_check
  check (cardinality(genres) <= 13);
alter table public.projects drop constraint if exists projects_reward_check;
alter table public.projects add constraint projects_reward_check
  check ((reward_min is null and reward_max is null)
         or (reward_min is not null and reward_max is not null
             and reward_min >= 0 and reward_max >= reward_min and reward_max <= 100000));
alter table public.projects drop constraint if exists projects_dates_check;
alter table public.projects add constraint projects_dates_check
  check (deadline_on >= opens_on
         and (work_starts_on is null or work_ends_on is null or work_ends_on >= work_starts_on));
alter table public.projects drop constraint if exists projects_source_check;
alter table public.projects add constraint projects_source_check
  check (source in ('arklings', 'request'));

create index if not exists projects_created_idx  on public.projects (created_at desc, id desc) where deleted_at is null;
create index if not exists projects_deadline_idx on public.projects (deadline_on) where closed_at is null and deleted_at is null;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- 3) 저장 직전 검사 ---------------------------------------------------------------------------------
--   · 새로 만들 때 closed_at은 비어 있어야 한다.
--   · closed_at은 처리 함수·예약 실행이 같은 처리 안에서 표시(app.project_fn)를 켠 때만 바뀐다.
--   · 올린 운영자(posted_by)는 한 번 정해지면 다른 사람으로 못 바꾼다(운영자 계정이 지워져 비워지는 것은 허용).
create or replace function public.projects_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.closed_at is not null then
      raise exception 'closed_at_by_function_only';
    end if;
    return new;
  end if;
  if new.closed_at is distinct from old.closed_at
     and coalesce(current_setting('app.project_fn', true), '') <> '1' then
    raise exception 'closed_at_by_function_only';
  end if;
  if old.posted_by is not null and new.posted_by is not null and new.posted_by is distinct from old.posted_by then
    raise exception 'posted_by_frozen';
  end if;
  return new;
end;
$$;

drop trigger if exists projects_guard on public.projects;
create trigger projects_guard
  before insert or update on public.projects
  for each row execute function public.projects_guard();

-- 4) 접근 규칙(RLS) ---------------------------------------------------------------------------------
alter table public.projects enable row level security;

revoke all on public.projects from anon, authenticated;
grant select on public.projects to anon, authenticated;
grant insert, update on public.projects to authenticated;     -- 지우기 권한은 주지 않는다(소프트 삭제)

-- 로그인 안 한 사람(anon)은 운영자 확인 함수를 쓸 수 없으므로 정책을 둘로 나눈다.
drop policy if exists "projects read anon" on public.projects;
create policy "projects read anon" on public.projects
  for select to anon
  using (deleted_at is null);

drop policy if exists "projects read" on public.projects;
create policy "projects read" on public.projects
  for select to authenticated
  using (deleted_at is null or (select public.is_admin()));

drop policy if exists "projects insert admin" on public.projects;
create policy "projects insert admin" on public.projects
  for insert to authenticated
  with check ((select public.is_admin()) and (select public.is_email_confirmed()) and posted_by = (select auth.uid()));

drop policy if exists "projects update admin" on public.projects;
create policy "projects update admin" on public.projects
  for update to authenticated
  using ((select public.is_admin()) and (select public.is_email_confirmed()))
  with check ((select public.is_admin()) and (select public.is_email_confirmed()));
