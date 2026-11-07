-- 미션7 크리에이터 데이터: 프로필·채널 링크·작품·작품 안 요소, 파일 비공개 보관함, 남이 보는 공개용 보기(view).
-- Supabase 화면의 SQL Editor에서 0008 다음에 실행한다. 기존 데이터는 지우지 않고, 여러 번 실행해도 안전하다.
-- 기준 문서: docs/creator-pages-plan.md (0-4 후속 확정 표, D5·D7·D12·D20·D27~D29·D37, 4-1·4-4).
--
-- 규칙 요약
--   · creator_profiles : 크리에이터 한 명(공개 주소·역할·소개 글·협업 받는 중·공개 여부·대표 이미지/영상). 비공개가 기본.
--                        공개 주소는 한 번 정하면 못 바꾼다(D5). 표 자체는 본인만 읽고 쓴다.
--   · creator_channels : 채널 링크(이름·https 주소) 사람당 5개까지.
--   · creator_works    : 작품 한 건(제목·역할 여러 개·장르 여러 개·종류·분량·로그라인·붙인 사이트 기획안). 사람당 12개까지.
--                        공개 단위는 작품이다. 공개하려면 프로필이 있고 이메일 확인을 마친 계정이어야 한다.
--                        한 기획안은 한 작품에만 붙일 수 있고, 작품을 내리거나 지우면 그 기획안도 비공개로 돌아간다(D29).
--   · creator_work_blocks : 작품 안 요소(글·이미지·영상(유튜브)·문서(PDF)). 작품당 20개, 사람당 파일 합계 20MB까지(D27).
--   · 보관함 creator-works : 비공개. 올리기·읽기는 서버 전용 열쇠로 앱 서버만 한다(정책 없음).
--   · 남이 보는 길은 보기(view)뿐이다. 보기는 공개 프로필의 공개 작품만 담고 주인 번호(UUID)와 이메일은 담지 않는다.
--   · 협업 신청에 작품 번호를 더하는 일(D30)과 프로필 경로 받는 사람(D14)은 코드와 함께 0010에서 한다. 여기서는 건드리지 않는다.
--
-- 이 파일이 쓰는 것: public.set_updated_at()(0002), public.profiles(0002), public.plans(0004).

-- 1) 크리에이터 프로필 -------------------------------------------------------------------------
create table if not exists public.creator_profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  public_handle  text not null,
  roles          text[] not null,
  bio            text not null default '' check (char_length(bio) <= 500),   -- 소개 글(선택). 한 줄 소개는 없앴다(0-4 5번)
  open_to_collab boolean not null default true,                              -- 협업 신청 받는 중(D16: 기본 켜짐)
  is_public      boolean not null default false,                             -- 마이페이지에서 만들면 기본 비공개(D9)
  hero_kind      text check (hero_kind in ('image', 'video')),               -- 프로필 맨 위 대표 이미지·영상(0-4 v)
  hero_path      text,
  hero_bytes     integer check (hero_bytes is null or hero_bytes > 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint creator_profiles_handle_format check (
    public_handle ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
    and char_length(public_handle) between 3 and 20
    and position('--' in public_handle) = 0
    and public_handle <> all (array['new','edit','admin','api','auth','creators','creator','portfolio','planner','mypage','login','signup','privacy','collab','settings','help','about','me','arklings','dev-preview'])
  ),
  constraint creator_profiles_roles check (
    cardinality(roles) between 1 and 6
    and roles <@ array['video','script','art_director','history_advisor','producer','other']::text[]
  ),
  constraint creator_profiles_hero check (
    (hero_kind is null and hero_path is null and hero_bytes is null)
    or (hero_kind is not null and hero_path is not null and hero_bytes is not null)
  ),
  constraint creator_profiles_hero_path check (hero_path is null or hero_path ~ '^[0-9a-f-]{36}\.(jpg|png|webp|mp4)$'),
  constraint creator_profiles_bio_chars check (bio !~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f<>]')
);

create unique index if not exists creator_profiles_handle_uidx on public.creator_profiles (lower(public_handle));
create index if not exists creator_profiles_public_idx on public.creator_profiles (created_at desc) where is_public;

drop trigger if exists creator_profiles_set_updated_at on public.creator_profiles;
create trigger creator_profiles_set_updated_at
  before update on public.creator_profiles
  for each row execute function public.set_updated_at();

-- 주인·공개 주소·만든 시각은 만든 뒤 바꿀 수 없다(D5).
create or replace function public.creator_profiles_freeze() returns trigger
language plpgsql
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.public_handle is distinct from old.public_handle
     or new.created_at is distinct from old.created_at then
    raise exception 'creator_profiles: user_id/public_handle/created_at cannot be changed';
  end if;
  return new;
end $$;

drop trigger if exists creator_profiles_freeze_check on public.creator_profiles;
create trigger creator_profiles_freeze_check
  before update on public.creator_profiles
  for each row execute function public.creator_profiles_freeze();

-- 2) 채널 링크 ----------------------------------------------------------------------------------
create table if not exists public.creator_channels (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.creator_profiles(user_id) on delete cascade,
  label      text not null check (char_length(label) between 1 and 20 and label !~ '[\u0001-\u001f\u007f<>]'),
  url        text not null check (char_length(url) <= 2000 and url ~ '^https://[^[:space:]]+$'),
  position   integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index if not exists creator_channels_user_idx on public.creator_channels (user_id, position);

create or replace function public.creator_channels_limit() returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.creator_channels where user_id = new.user_id) >= 5 then
    raise exception 'channel_limit_reached';
  end if;
  return new;
end $$;

drop trigger if exists creator_channels_limit_check on public.creator_channels;
create trigger creator_channels_limit_check
  before insert on public.creator_channels
  for each row execute function public.creator_channels_limit();

-- 3) 작품 ---------------------------------------------------------------------------------------
create table if not exists public.creator_works (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  title               text not null check (char_length(title) between 1 and 60 and title !~ '[\u0001-\u001f\u007f<>]'),
  roles               text[] not null,                                          -- 작품당 역할 여러 개(D27-1)
  genres              text[] not null default '{}' check (cardinality(genres) <= 13),  -- 장르 이름 목록은 앱(components/creators/genres.ts)이 정한다(D37)
  kind                text check (kind is null or char_length(kind) <= 30),     -- 작품 종류(로그라인·아웃라인·… 이름은 앱이 정한다)
  form                text check (form is null or form in ('long', 'short')),   -- 분량(롱폼·숏폼)
  logline             text not null default '' check (char_length(logline) <= 1000),  -- 맨 위 고정 로그라인(D35). 글자 수 규칙(200자)은 서버가 다시 검사한다
  plan_id             uuid unique references public.plans(id) on delete set null,      -- 붙인 사이트 기획안(한 기획안은 한 작품에만, D29)
  is_public           boolean not null default false,
  first_published_at  timestamptz,                                              -- 처음 올린 시각(한 번만 찍힘, 앱이 못 바꿈)
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint creator_works_roles check (
    cardinality(roles) between 1 and 6
    and roles <@ array['video','script','art_director','history_advisor','producer','other']::text[]
  ),
  constraint creator_works_logline_chars check (logline !~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f<>]')
);

create index if not exists creator_works_owner_idx on public.creator_works (owner_id, sort_order, created_at);
create index if not exists creator_works_public_idx on public.creator_works (first_published_at desc, id desc) where is_public;

drop trigger if exists creator_works_set_updated_at on public.creator_works;
create trigger creator_works_set_updated_at
  before update on public.creator_works
  for each row execute function public.set_updated_at();

-- 저장 직전 검사: 사람당 12개, 내 기획안만 붙이기, 공개 조건, 처음 올린 시각, 주인 고정.
create or replace function public.creator_works_before() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.creator_works where owner_id = new.owner_id) >= 12 then
      raise exception 'work_limit_reached';
    end if;
  else
    if new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at then
      raise exception 'creator_works: owner/created_at cannot be changed';
    end if;
  end if;

  -- 붙이는 기획안은 내 것이어야 한다.
  if new.plan_id is not null and not exists (
    select 1 from public.plans p where p.id = new.plan_id and p.owner_id = new.owner_id
  ) then
    raise exception 'work_plan_not_owned';
  end if;

  -- 공개하려면 프로필이 있고 이메일 확인을 마친 계정이어야 한다(앱을 거치지 않고 DB를 직접 열어도 막힌다).
  if new.is_public then
    if not exists (select 1 from public.creator_profiles cp where cp.user_id = new.owner_id) then
      raise exception 'creator_profile_required';
    end if;
    if not exists (
      select 1 from auth.users u
       where u.id = new.owner_id and u.email is not null and u.email_confirmed_at is not null
    ) then
      raise exception 'email_not_confirmed';
    end if;
  end if;

  -- 처음 올린 시각: 처음 공개하는 순간 한 번만 찍고, 껐다 켜도 바뀌지 않는다.
  if tg_op = 'UPDATE' and old.first_published_at is not null then
    new.first_published_at := old.first_published_at;
  elsif new.is_public then
    new.first_published_at := now();
  else
    new.first_published_at := null;
  end if;
  return new;
end $$;

drop trigger if exists creator_works_before_check on public.creator_works;
create trigger creator_works_before_check
  before insert or update on public.creator_works
  for each row execute function public.creator_works_before();

-- 작품을 내리거나, 기획안을 떼거나, 작품을 지우면 그 기획안도 비공개로 돌아간다(D29).
create or replace function public.creator_works_after() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.plan_id is not null
     and (tg_op = 'DELETE' or new.is_public = false or new.plan_id is distinct from old.plan_id) then
    update public.plans set is_public = false where id = old.plan_id and is_public;
  end if;
  return null;
end $$;

drop trigger if exists creator_works_after_check on public.creator_works;
create trigger creator_works_after_check
  after update or delete on public.creator_works
  for each row execute function public.creator_works_after();

-- 4) 작품 안 요소 -------------------------------------------------------------------------------
create table if not exists public.creator_work_blocks (
  id         uuid primary key default gen_random_uuid(),
  work_id    uuid not null references public.creator_works(id) on delete cascade,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  position   integer not null check (position >= 0),                    -- 요소 순서(로그라인은 작품 칸이라 여기 없다)
  kind       text not null check (kind in ('text', 'image', 'video', 'document')),
  body       text check (body is null or char_length(body) <= 5000),    -- 글
  file_path  text check (file_path is null or file_path ~ '^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$'),
  file_name  text check (file_name is null or char_length(file_name) <= 200),
  file_bytes integer check (file_bytes is null or file_bytes > 0),
  youtube_id text check (youtube_id is null or youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_work_blocks_shape check (
    (kind = 'text'     and body is not null and btrim(body) <> '' and file_path is null and file_bytes is null and youtube_id is null)
    or (kind = 'image' and file_path is not null and file_bytes is not null and file_bytes <= 5242880 and body is null and youtube_id is null)
    or (kind = 'document' and file_path is not null and file_bytes is not null and file_bytes <= 10485760 and body is null and youtube_id is null)
    or (kind = 'video' and youtube_id is not null and body is null and file_path is null and file_bytes is null)
  ),
  constraint creator_work_blocks_body_chars check (body is null or body !~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f<>]')
);

create index if not exists creator_work_blocks_work_idx on public.creator_work_blocks (work_id, position);
create index if not exists creator_work_blocks_owner_idx on public.creator_work_blocks (owner_id);

drop trigger if exists creator_work_blocks_set_updated_at on public.creator_work_blocks;
create trigger creator_work_blocks_set_updated_at
  before update on public.creator_work_blocks
  for each row execute function public.set_updated_at();

-- 요소 저장 직전 검사: 작품의 주인과 같아야 하고, 작품당 20개, 사람당 파일 합계 20MB(이미지+PDF).
create or replace function public.creator_work_blocks_before() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_used  bigint;
begin
  select w.owner_id into v_owner from public.creator_works w where w.id = new.work_id;
  if v_owner is null or v_owner is distinct from new.owner_id then
    raise exception 'block_owner_mismatch';
  end if;

  if tg_op = 'UPDATE' then
    if new.work_id is distinct from old.work_id or new.owner_id is distinct from old.owner_id then
      raise exception 'creator_work_blocks: work/owner cannot be changed';
    end if;
  else
    if (select count(*) from public.creator_work_blocks b where b.work_id = new.work_id) >= 20 then
      raise exception 'block_limit_reached';
    end if;
  end if;

  if new.file_bytes is not null then
    select coalesce(sum(b.file_bytes), 0) into v_used
      from public.creator_work_blocks b
     where b.owner_id = new.owner_id
       and (tg_op = 'INSERT' or b.id <> new.id);
    if v_used + new.file_bytes > 20971520 then
      raise exception 'file_quota_exceeded';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists creator_work_blocks_before_check on public.creator_work_blocks;
create trigger creator_work_blocks_before_check
  before insert or update on public.creator_work_blocks
  for each row execute function public.creator_work_blocks_before();

-- 5) 접근 규칙(RLS): 네 표 모두 본인만 읽고 쓴다. 쓰기는 이메일 확인을 마친 계정만. 남이 보는 길은 아래 보기뿐이다.
alter table public.creator_profiles    enable row level security;
alter table public.creator_channels    enable row level security;
alter table public.creator_works       enable row level security;
alter table public.creator_work_blocks enable row level security;

revoke all on public.creator_profiles, public.creator_channels, public.creator_works, public.creator_work_blocks from anon;
grant select, insert, update, delete on public.creator_profiles, public.creator_channels, public.creator_works, public.creator_work_blocks to authenticated;

-- creator_profiles
drop policy if exists "creator_profiles read own" on public.creator_profiles;
create policy "creator_profiles read own" on public.creator_profiles
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "creator_profiles insert own" on public.creator_profiles;
create policy "creator_profiles insert own" on public.creator_profiles
  for insert to authenticated with check (user_id = (select auth.uid()) and (select public.is_email_confirmed()));
drop policy if exists "creator_profiles update own" on public.creator_profiles;
create policy "creator_profiles update own" on public.creator_profiles
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_email_confirmed()))
  with check (user_id = (select auth.uid()) and (select public.is_email_confirmed()));
drop policy if exists "creator_profiles delete own" on public.creator_profiles;
create policy "creator_profiles delete own" on public.creator_profiles
  for delete to authenticated using (user_id = (select auth.uid()) and (select public.is_email_confirmed()));

-- creator_channels
drop policy if exists "creator_channels read own" on public.creator_channels;
create policy "creator_channels read own" on public.creator_channels
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "creator_channels insert own" on public.creator_channels;
create policy "creator_channels insert own" on public.creator_channels
  for insert to authenticated with check (user_id = (select auth.uid()) and (select public.is_email_confirmed()));
drop policy if exists "creator_channels update own" on public.creator_channels;
create policy "creator_channels update own" on public.creator_channels
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_email_confirmed()))
  with check (user_id = (select auth.uid()) and (select public.is_email_confirmed()));
drop policy if exists "creator_channels delete own" on public.creator_channels;
create policy "creator_channels delete own" on public.creator_channels
  for delete to authenticated using (user_id = (select auth.uid()) and (select public.is_email_confirmed()));

-- creator_works
drop policy if exists "creator_works read own" on public.creator_works;
create policy "creator_works read own" on public.creator_works
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "creator_works insert own" on public.creator_works;
create policy "creator_works insert own" on public.creator_works
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.is_email_confirmed()));
drop policy if exists "creator_works update own" on public.creator_works;
create policy "creator_works update own" on public.creator_works
  for update to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_email_confirmed()))
  with check (owner_id = (select auth.uid()) and (select public.is_email_confirmed()));
drop policy if exists "creator_works delete own" on public.creator_works;
create policy "creator_works delete own" on public.creator_works
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.is_email_confirmed()));

-- creator_work_blocks
drop policy if exists "creator_work_blocks read own" on public.creator_work_blocks;
create policy "creator_work_blocks read own" on public.creator_work_blocks
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "creator_work_blocks insert own" on public.creator_work_blocks;
create policy "creator_work_blocks insert own" on public.creator_work_blocks
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.is_email_confirmed()));
drop policy if exists "creator_work_blocks update own" on public.creator_work_blocks;
create policy "creator_work_blocks update own" on public.creator_work_blocks
  for update to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_email_confirmed()))
  with check (owner_id = (select auth.uid()) and (select public.is_email_confirmed()));
drop policy if exists "creator_work_blocks delete own" on public.creator_work_blocks;
create policy "creator_work_blocks delete own" on public.creator_work_blocks
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.is_email_confirmed()));

-- 6) 남이 보는 공개용 보기(view) ------------------------------------------------------------------
-- 보기는 표 주인(postgres)의 권한으로 읽는다(표를 남에게 열지 않기 위해). 그래서 어떤 칸을 내보낼지가 보안이다:
-- 주인 번호(UUID)·이메일은 한 칸도 내지 않고, 공개 프로필의 공개 작품만 담는다. 파일 경로는 임의 이름이라 주인 번호가 들어 있지 않다.
create or replace view public.creators_public
with (security_invoker = false) as
select
  cp.public_handle,
  coalesce(pr.display_name, '이름 없음') as display_name,
  cp.roles,
  cp.bio,
  cp.open_to_collab,
  cp.hero_kind,
  cp.hero_path,
  cp.created_at,
  (select count(*) from public.creator_works w where w.owner_id = cp.user_id and w.is_public and w.first_published_at is not null)::int as work_count,
  coalesce((select array_agg(distinct g order by g)
              from public.creator_works w, unnest(w.genres) g
             where w.owner_id = cp.user_id and w.is_public and w.first_published_at is not null), '{}') as genres,
  coalesce((select array_agg(distinct w.form)
              from public.creator_works w
             where w.owner_id = cp.user_id and w.is_public and w.first_published_at is not null and w.form is not null), '{}') as forms,
  lw.title    as latest_title,
  lw.logline  as latest_logline,
  lw.genres   as latest_genres
from public.creator_profiles cp
left join public.profiles pr on pr.id = cp.user_id
left join lateral (
  select w.title, w.logline, w.genres
    from public.creator_works w
   where w.owner_id = cp.user_id and w.is_public and w.first_published_at is not null
   order by w.first_published_at desc, w.id desc
   limit 1
) lw on true
where cp.is_public;

create or replace view public.creator_channels_public
with (security_invoker = false) as
select cp.public_handle, ch.label, ch.url, ch.position
  from public.creator_channels ch
  join public.creator_profiles cp on cp.user_id = ch.user_id
 where cp.is_public;

create or replace view public.creator_works_public
with (security_invoker = false) as
select
  w.id,
  cp.public_handle as author_handle,
  coalesce(pr.display_name, '이름 없음') as author_name,
  w.title,
  w.roles,
  w.genres,
  w.kind,
  w.form,
  w.logline,
  w.first_published_at as published_at,
  w.sort_order
from public.creator_works w
join public.creator_profiles cp on cp.user_id = w.owner_id
left join public.profiles pr on pr.id = w.owner_id
where w.is_public and w.first_published_at is not null and cp.is_public;

create or replace view public.creator_blocks_public
with (security_invoker = false) as
select b.id, b.work_id, b.position, b.kind, b.body, b.file_path, b.file_name, b.file_bytes, b.youtube_id
  from public.creator_work_blocks b
  join public.creator_works w on w.id = b.work_id
  join public.creator_profiles cp on cp.user_id = w.owner_id
 where w.is_public and w.first_published_at is not null and cp.is_public;

revoke all on public.creators_public, public.creator_channels_public, public.creator_works_public, public.creator_blocks_public from public, anon, authenticated;
grant select on public.creators_public, public.creator_channels_public, public.creator_works_public, public.creator_blocks_public to anon, authenticated;

-- 7) 파일 보관함(비공개). 올리기·읽기는 서버 전용 열쇠로 앱 서버만 한다(정책을 만들지 않으므로 로그인한 사람도 직접 못 연다).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('creator-works', 'creator-works', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'])
on conflict (id) do update
   set public = false,
       file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'];
