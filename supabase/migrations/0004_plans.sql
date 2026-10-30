-- 미션7 단계 3: 기획안 서버 저장(기획안·임시저장 이력·공개 사본)과 메일 하루 3번 제한.
-- Supabase 화면의 SQL Editor에서 0003 다음에 실행한다. 기존 데이터는 지우지 않고, 여러 번 실행해도 안전하다.
--
-- 규칙 요약
--   · plans          : 기획안 한 건(주인·제목·공개 여부·공개용 사본). 공개된 것만 누구나 읽고, 쓰기는 주인만.
--   · plan_revisions : 「임시저장」 한 번 = 한 건. 고른 선택지 / 아클링스가 제안한 문장 / 사용자가 고친 문장을 따로 담는다.
--                      주인만 읽고·고치고·지운다. 비공개 이력은 남에게 보이지 않는다. 기획안당 최대 100건.
--   · mail_usage     : 기획안 PDF 메일 하루(한국 날짜) 3번 제한.

-- 1) 기획안
create table if not exists public.plans (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 60),
  is_public       boolean not null default false,
  published_at    timestamptz,
  public_content  jsonb,   -- 공개한 순간의 완성 내용 사본(이력과 따로 둔다 → 비로그인 방문자는 이 사본만 읽는다)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint plans_public_has_copy check (is_public = false or (public_content is not null and published_at is not null)),
  constraint plans_public_content_shape check (public_content is null or (jsonb_typeof(public_content) = 'object' and pg_column_size(public_content) < 20000))
);

create index if not exists plans_owner_idx on public.plans (owner_id, updated_at desc);
create index if not exists plans_public_idx on public.plans (published_at desc) where is_public;

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- 주인은 만든 뒤 바꿀 수 없다.
create or replace function public.plans_freeze_columns() returns trigger
language plpgsql
as $$
begin
  if new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at then
    raise exception 'plans: owner/created_at cannot be changed';
  end if;
  return new;
end $$;

drop trigger if exists plans_freeze on public.plans;
create trigger plans_freeze
  before update on public.plans
  for each row execute function public.plans_freeze_columns();

-- 한 사람이 만들 수 있는 기획안은 30건까지(저장 공간 남용 방지).
create or replace function public.plans_limit() returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.plans where owner_id = new.owner_id) >= 30 then
    raise exception 'plan_limit_reached';
  end if;
  return new;
end $$;

drop trigger if exists plans_limit_check on public.plans;
create trigger plans_limit_check
  before insert on public.plans
  for each row execute function public.plans_limit();

alter table public.plans enable row level security;

drop policy if exists "plans read public or own" on public.plans;
create policy "plans read public or own" on public.plans
  for select to anon, authenticated
  using (is_public or owner_id = (select auth.uid()));

drop policy if exists "plans insert own" on public.plans;
create policy "plans insert own" on public.plans
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "plans update own" on public.plans;
create policy "plans update own" on public.plans
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "plans delete own" on public.plans;
create policy "plans delete own" on public.plans
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- 2) 임시저장 이력
create table if not exists public.plan_revisions (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.plans(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  selections  jsonb not null,   -- 사용자가 쓴 답과 고른 선택지(예/아니오)
  suggested   jsonb not null,   -- 아클링스가 제안한 문장(만든 방식 method 포함 → 나중에 AI 문장도 같은 자리에)
  edited      jsonb not null default '{}'::jsonb,  -- 사용자가 직접 고친 문장(고친 섹션만). 제안 문장을 덮어쓰지 않는다.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint plan_revisions_shape check (
    jsonb_typeof(selections) = 'object' and jsonb_typeof(suggested) = 'object' and jsonb_typeof(edited) = 'object'
    and pg_column_size(selections) + pg_column_size(suggested) + pg_column_size(edited) < 40000
  )
);

create index if not exists plan_revisions_plan_idx on public.plan_revisions (plan_id, created_at desc);

drop trigger if exists plan_revisions_set_updated_at on public.plan_revisions;
create trigger plan_revisions_set_updated_at
  before update on public.plan_revisions
  for each row execute function public.set_updated_at();

-- 어느 기획안·누구 것인지는 만든 뒤 바꿀 수 없다.
create or replace function public.plan_revisions_freeze_columns() returns trigger
language plpgsql
as $$
begin
  if new.plan_id is distinct from old.plan_id or new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at then
    raise exception 'plan_revisions: plan/owner/created_at cannot be changed';
  end if;
  return new;
end $$;

drop trigger if exists plan_revisions_freeze on public.plan_revisions;
create trigger plan_revisions_freeze
  before update on public.plan_revisions
  for each row execute function public.plan_revisions_freeze_columns();

-- 기획안당 최대 100건. 기획안 줄을 잠근 뒤 세므로 동시에 저장해도 100건을 넘지 않는다.
create or replace function public.plan_revisions_limit() returns trigger
language plpgsql
as $$
begin
  perform 1 from public.plans where id = new.plan_id for update;
  if (select count(*) from public.plan_revisions where plan_id = new.plan_id) >= 100 then
    raise exception 'revision_limit_reached';
  end if;
  return new;
end $$;

drop trigger if exists plan_revisions_limit_check on public.plan_revisions;
create trigger plan_revisions_limit_check
  before insert on public.plan_revisions
  for each row execute function public.plan_revisions_limit();

alter table public.plan_revisions enable row level security;

drop policy if exists "revisions read own" on public.plan_revisions;
create policy "revisions read own" on public.plan_revisions
  for select to authenticated
  using (owner_id = (select auth.uid()));

-- 추가: 내 이름으로, 내 기획안에만.
drop policy if exists "revisions insert own" on public.plan_revisions;
create policy "revisions insert own" on public.plan_revisions
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.plans p where p.id = plan_id and p.owner_id = (select auth.uid()))
  );

drop policy if exists "revisions update own" on public.plan_revisions;
create policy "revisions update own" on public.plan_revisions
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "revisions delete own" on public.plan_revisions;
create policy "revisions delete own" on public.plan_revisions
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- 3) 협업 신청이 가리키는 기획안 연결. 기획안이 지워지면 신청은 남고 연결만 비워진다.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'collab_requests_plan_id_fkey') then
    alter table public.collab_requests
      add constraint collab_requests_plan_id_fkey foreign key (plan_id) references public.plans(id) on delete set null;
  end if;
end $$;

-- 0003의 고정 규칙을 한 군데만 고친다: 기획안이 지워져 plan_id가 비워지는 것은 허용(그 밖의 변경은 계속 막는다).
create or replace function public.collab_requests_freeze_columns() returns trigger
language plpgsql
as $$
begin
  if new.recipient_kind is distinct from old.recipient_kind
     or (new.recipient_id is distinct from old.recipient_id and new.recipient_id is not null)
     or (new.plan_id is distinct from old.plan_id and new.plan_id is not null)
     or new.created_at is distinct from old.created_at then
    raise exception 'collab_requests: recipient/plan/created_at cannot be changed';
  end if;
  return new;
end $$;

-- 4) 메일 하루 3번 제한(한국 날짜 기준). 표는 앱이 직접 만지지 못하고 아래 함수 두 개로만 센다.
create table if not exists public.mail_usage (
  user_id  uuid not null references auth.users(id) on delete cascade,
  day      date not null,
  sent     integer not null default 0 check (sent between 0 and 3),
  primary key (user_id, day)
);
alter table public.mail_usage enable row level security;
-- 정책을 만들지 않는다 → 로그인한 사용자도 이 표를 직접 읽거나 고칠 수 없다.

-- 자리를 하나 잡는다. 오늘 이미 3번이면 false. (보내기 전에 부르고, 보내기가 실패하면 release로 돌려 놓는다)
create or replace function public.reserve_plan_mail() returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  got integer;
begin
  if uid is null then return false; end if;
  insert into public.mail_usage as m (user_id, day, sent)
  values (uid, (now() at time zone 'Asia/Seoul')::date, 1)
  on conflict (user_id, day) do update set sent = m.sent + 1 where m.sent < 3
  returning 1 into got;
  return got is not null;
end $$;

create or replace function public.release_plan_mail() returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.mail_usage
     set sent = greatest(sent - 1, 0)
   where user_id = (select auth.uid()) and day = (now() at time zone 'Asia/Seoul')::date;
end $$;

revoke all on function public.reserve_plan_mail() from public;
revoke all on function public.release_plan_mail() from public;
grant execute on function public.reserve_plan_mail() to authenticated;
grant execute on function public.release_plan_mail() to authenticated;
