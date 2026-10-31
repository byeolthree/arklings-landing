-- 미션7 단계 5: 포트폴리오(공개된 기획안 목록·상세)와 협업 신청의 받는 사람(기획안 주인), 이메일 확인을 마치지 않은 계정 막기.
-- Supabase 화면의 SQL Editor에서 0006 다음에 실행한다. 기존 데이터는 지우지 않고, 여러 번 실행해도 안전하다.
--
-- 규칙 요약
--   · plans.first_published_at : 「처음 공개한 시각」. 처음 공개할 때 한 번만 찍히고, 공개를 껐다 켜도 바뀌지 않는다. 앱이 바꾸지 못한다.
--                                (기존 published_at은 다시 공개할 때마다 덮어써지는 「마지막으로 공개한 시각」으로 그대로 둔다)
--   · portfolio_items          : 포트폴리오 화면이 읽는 보기(view). 공개된 기획안의 제목·처음 공개한 시각·공개 이름·공개용 사본만 담고,
--                                주인 번호(owner_id)와 이메일은 담지 않는다. 임시저장 이력(plan_revisions)은 여기에 없다.
--   · 이메일 확인 규칙         : 이메일 확인을 마치지 않은 계정(카카오 등)은 DB를 직접 열어도 기획안·이력·공개 이름을 만들거나 고칠 수 없고,
--                                받은 협업 신청을 고치거나 지울 수 없다.
--   · 기획안으로 온 신청       : 신청에 plan_id가 있으면 DB가 그 기획안의 주인을 받는 사람으로 정한다(앱이 보낸 값을 믿지 않는다).
--                                공개 중인 기획안, 이메일 확인을 마친 주인만 받을 수 있다.

-- 1) 처음 공개한 시각 -------------------------------------------------------------------------
alter table public.plans add column if not exists first_published_at timestamptz;

-- 이미 공개된 기획안은 지금의 공개 시각을 처음 공개한 시각으로 채운다. (「고친 시각」이 바뀌지 않도록 갱신 트리거를 잠깐 끈다)
alter table public.plans disable trigger plans_set_updated_at;
update public.plans
   set first_published_at = published_at
 where first_published_at is null and is_public and published_at is not null;
alter table public.plans enable trigger plans_set_updated_at;

create or replace function public.plans_first_published() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if old.first_published_at is not null then
      new.first_published_at := old.first_published_at; -- 한 번 찍히면 바꿀 수 없다
      return new;
    end if;
  end if;
  if new.is_public then
    new.first_published_at := now();                    -- 처음 공개하는 순간 한 번만
  else
    new.first_published_at := null;                     -- 공개한 적 없으면 비어 있다
  end if;
  return new;
end $$;

drop trigger if exists plans_first_published_set on public.plans;
create trigger plans_first_published_set
  before insert or update on public.plans
  for each row execute function public.plans_first_published();

create index if not exists plans_portfolio_idx on public.plans (first_published_at desc, id desc) where is_public;

-- 2) 이메일 확인을 마친 계정인지 ----------------------------------------------------------------
create or replace function public.is_email_confirmed() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
     where u.id = (select auth.uid()) and u.email is not null and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_email_confirmed() from public, anon;
grant execute on function public.is_email_confirmed() to authenticated;

-- 3) 이메일 확인 규칙을 접근 규칙(RLS)에 더한다. 이름은 그대로 두고 조건만 더해 다시 만든다.
drop policy if exists "plans insert own" on public.plans;
create policy "plans insert own" on public.plans
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.is_email_confirmed()));

drop policy if exists "plans update own" on public.plans;
create policy "plans update own" on public.plans
  for update to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_email_confirmed()))
  with check (owner_id = (select auth.uid()) and (select public.is_email_confirmed()));

drop policy if exists "revisions insert own" on public.plan_revisions;
create policy "revisions insert own" on public.plan_revisions
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select public.is_email_confirmed())
    and exists (select 1 from public.plans p where p.id = plan_id and p.owner_id = (select auth.uid()))
  );

drop policy if exists "revisions update own" on public.plan_revisions;
create policy "revisions update own" on public.plan_revisions
  for update to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_email_confirmed()))
  with check (owner_id = (select auth.uid()) and (select public.is_email_confirmed()));

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()) and (select public.is_email_confirmed()));

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and (select public.is_email_confirmed()))
  with check (id = (select auth.uid()) and (select public.is_email_confirmed()));

drop policy if exists "collab recipients update" on public.collab_requests;
create policy "collab recipients update" on public.collab_requests
  for update to authenticated
  using (
    (select public.is_email_confirmed())
    and (recipient_id = (select auth.uid()) or (recipient_kind = 'arklings' and (select public.is_admin())))
  )
  with check (
    (select public.is_email_confirmed())
    and (recipient_id = (select auth.uid()) or (recipient_kind = 'arklings' and (select public.is_admin())))
  );

drop policy if exists "collab recipients delete" on public.collab_requests;
create policy "collab recipients delete" on public.collab_requests
  for delete to authenticated
  using (
    (select public.is_email_confirmed())
    and (recipient_id = (select auth.uid()) or (recipient_kind = 'arklings' and (select public.is_admin())))
  );

-- 4) 기획안으로 들어온 협업 신청: 받는 사람은 DB가 기획안에서 찾아 정한다.
--    기획안 줄을 잠근 채(for share) 확인하므로, 확인과 저장 사이에 주인이 공개를 끄는 일이 끼어들 수 없다.
create or replace function public.collab_requests_apply_plan() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner  uuid;
  v_public boolean;
begin
  if new.plan_id is not null then
    select p.owner_id, p.is_public into v_owner, v_public
      from public.plans p
     where p.id = new.plan_id
       for share;
    if not found or not v_public then
      raise exception 'plan_not_public';
    end if;
    if not exists (
      select 1 from auth.users u
       where u.id = v_owner and u.email is not null and u.email_confirmed_at is not null
    ) then
      raise exception 'plan_not_public';
    end if;
    new.recipient_kind := 'user';
    new.recipient_id   := v_owner;
    new.source_work_id := null;   -- 기획안으로 온 신청에는 작품 선택이 없다
  end if;
  return new;
end $$;

drop trigger if exists collab_requests_apply_plan_check on public.collab_requests;
create trigger collab_requests_apply_plan_check
  before insert on public.collab_requests
  for each row execute function public.collab_requests_apply_plan();

-- 5) 포트폴리오 보기(view). 로그인한 사람이든 아니든 호출한 사람의 권한(RLS)으로 읽으므로, 공개된 기획안만 나온다.
--    주인 번호(owner_id)는 담지 않는다. 임시저장 이력은 여기에 없다.
create or replace view public.portfolio_items
with (security_invoker = true) as
select
  p.id,
  p.title,
  p.first_published_at as published_at,
  coalesce(pr.display_name, '이름 없음') as author_name,
  p.public_content
from public.plans p
left join public.profiles pr on pr.id = p.owner_id
where p.is_public
  and p.first_published_at is not null
  and p.public_content is not null;

revoke all on public.portfolio_items from public, anon, authenticated;
grant select on public.portfolio_items to anon, authenticated;
