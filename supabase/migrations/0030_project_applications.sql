-- 프로젝트(외주 매칭) 2단계 ②: 지원 표 project_applications와, 지원자 수를 담은 공개 보기 projects_public.
-- Supabase 화면의 SQL Editor에서 0029 다음에 실행한다. 기존 데이터는 지우지 않고, 여러 번 실행해도 안전하다.
--
-- 규칙 요약
--   · 한 사람은 한 공고에 한 번만 지원한다(공고+지원자 한 쌍은 한 줄).
--   · 읽기: 지원한 본인과 운영자만. 쓰기: 표에 쓰기 권한을 주지 않는다. 지원하기·수락하기·거절하기·마감하기 함수(0031)와
--     예약 실행(0033)만 쓴다. 그러므로 브라우저가 지원 상태를 직접 바꿀 수 없다.
--   · 상태: received(접수) → accepted(수락) 또는 rejected(거절). 한 번 정해진 상태는 되돌릴 수 없다(저장 직전 검사).
--   · 한 공고에서 수락된 지원은 1건뿐이다(부분 유일 색인). 처리 함수가 줄을 잠가 한 줄로 세우는 것과 별개로, DB가 마지막으로 막는 안전망이다.
--   · 포트폴리오는 지원자 본인의 크리에이터 작품(creator_works, 0009) 번호다. 작품이 지워지면 비워진다(지원은 남는다).
--   · 지원자 이름·연락처는 이 표에 복사하지 않는다(공개 이름은 profiles에서 읽는다).
--   · 지원자가 탈퇴하면 연쇄 삭제로 지원도 함께 지워진다.
--
-- 이 파일이 쓰는 것: public.projects(0029), public.creator_works(0009), public.set_updated_at()(0002), public.is_admin()(0003).

-- 1) 지원 표 ---------------------------------------------------------------------------------------
create table if not exists public.project_applications (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects(id) on delete cascade,
  applicant_id       uuid not null references auth.users(id) on delete cascade,
  portfolio_work_id  uuid references public.creator_works(id) on delete set null,
  motive             text not null,                       -- 지원 동기
  offered_reward     integer,                             -- 제안 보상(만 원, 선택)
  available_period   text,                                -- 가능한 기간(선택, 글)
  status             text not null default 'received',
  decided_at         timestamptz,                         -- 수락·거절한 시각
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.project_applications drop constraint if exists project_applications_pair_key;
alter table public.project_applications add constraint project_applications_pair_key unique (project_id, applicant_id);
alter table public.project_applications drop constraint if exists project_applications_motive_check;
alter table public.project_applications add constraint project_applications_motive_check
  check (char_length(motive) between 10 and 500 and motive !~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f<>]');
alter table public.project_applications drop constraint if exists project_applications_offer_check;
alter table public.project_applications add constraint project_applications_offer_check
  check (offered_reward is null or offered_reward between 0 and 100000);
alter table public.project_applications drop constraint if exists project_applications_period_check;
alter table public.project_applications add constraint project_applications_period_check
  check (available_period is null or (char_length(available_period) between 1 and 60 and available_period !~ '[\u0001-\u001f\u007f<>]'));
alter table public.project_applications drop constraint if exists project_applications_status_check;
alter table public.project_applications add constraint project_applications_status_check
  check (status in ('received', 'accepted', 'rejected'));
alter table public.project_applications drop constraint if exists project_applications_decided_check;
alter table public.project_applications add constraint project_applications_decided_check
  check ((status = 'received') = (decided_at is null));

create unique index if not exists project_applications_one_accepted_uidx
  on public.project_applications (project_id) where status = 'accepted';
create index if not exists project_applications_project_idx   on public.project_applications (project_id, status);
create index if not exists project_applications_applicant_idx on public.project_applications (applicant_id, created_at desc);

drop trigger if exists project_applications_set_updated_at on public.project_applications;
create trigger project_applications_set_updated_at
  before update on public.project_applications
  for each row execute function public.set_updated_at();

-- 2) 저장 직전 검사: 공고·지원자·지원 동기는 만든 뒤 못 바꾸고, 정해진 상태는 되돌릴 수 없다 -----------------------
create or replace function public.project_applications_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.project_id <> old.project_id or new.applicant_id <> old.applicant_id or new.motive <> old.motive
     or new.offered_reward is distinct from old.offered_reward or new.available_period is distinct from old.available_period then
    raise exception 'application_frozen';
  end if;
  if old.status <> 'received' and new.status <> old.status then
    raise exception 'already_decided';
  end if;
  return new;
end;
$$;

drop trigger if exists project_applications_guard on public.project_applications;
create trigger project_applications_guard
  before update on public.project_applications
  for each row execute function public.project_applications_guard();

-- 3) 접근 규칙(RLS): 읽기는 본인과 운영자만, 쓰기 정책은 하나도 만들지 않는다 -----------------------------------
alter table public.project_applications enable row level security;

revoke all on public.project_applications from anon, authenticated;
grant select on public.project_applications to authenticated;

drop policy if exists "project_applications read" on public.project_applications;
create policy "project_applications read" on public.project_applications
  for select to authenticated
  using (applicant_id = (select auth.uid()) or (select public.is_admin()));

-- 4) 공개 보기: 공고 + 모집 상태 + 지원자 수. 누구나 읽는다 -------------------------------------------------
--   · 상태(status)는 날짜와 closed_at에서 계산한다: 닫혔거나 마감일이 지났으면 closed, 모집 시작 전이면 soon, 나머지는 open.
--   · 이 보기는 만든 사람(owner)의 권한으로 읽는다(지원 표를 센다). 그래서 지원자 번호·이름·동기는 담지 않고 숫자만 담는다.
--   · 올린 운영자 번호(posted_by)와 삭제 표시(deleted_at)도 담지 않는다. 삭제 표시가 있는 공고는 이 보기에서 빠진다.
create or replace view public.projects_public as
select
  p.id, p.title, p.summary, p.description, p.roles, p.genres,
  p.reward_min, p.reward_max, p.opens_on, p.deadline_on, p.work_starts_on, p.work_ends_on,
  p.source, p.source_work_id, p.closed_at, p.created_at,
  case
    when p.closed_at is not null or p.deadline_on < public.kst_today() then 'closed'
    when p.opens_on > public.kst_today() then 'soon'
    else 'open'
  end as status,
  (select count(*) from public.project_applications a where a.project_id = p.id)::integer as applicant_count,
  (select count(*) from public.project_applications a where a.project_id = p.id and a.status = 'accepted')::integer as accepted_count
from public.projects p
where p.deleted_at is null;

revoke all on public.projects_public from anon, authenticated;
grant select on public.projects_public to anon, authenticated;
