-- 미션7 단계 4: 구글·카카오 로그인과 계정 이어주기에 필요한 DB 조각.
-- Supabase 화면의 SQL Editor에서 0005 다음에 실행한다. 기존 데이터는 지우지 않고, 여러 번 실행해도 안전하다.

-- 1) 소셜 로그인으로 가입하면 소셜이 준 이름을 공개 이름 첫 값으로 쓴다.
--    후보 순서: 가입 화면에서 입력한 이름 → full_name → name → nickname → preferred_username → user_name → 「회원 + 번호 4자리」
--    (카카오는 이름을 name 또는 nickname 쪽으로 준다.) 빈 문자열은 건너뛰고, 30자로 자른다.
create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name    text;
  v_consent text;
begin
  v_name := left(
    coalesce(
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'nickname', '')), ''),
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'preferred_username', '')), ''),
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'user_name', '')), '')
    ),
    30
  );
  if v_name is null then
    v_name := '회원 ' || left(replace(new.id::text, '-', ''), 4);
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, v_name)
  on conflict (id) do nothing;

  v_consent := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'consent_version', '')), '');
  if v_consent is not null then
    insert into public.profile_consents (user_id, consent_version)
    values (new.id, left(v_consent, 60))
    on conflict (user_id) do nothing;
  end if;

  return new;
end
$$;

-- 2) 이메일로 계정 찾기(서버 전용). 카카오처럼 이메일 없이 들어온 사람이 입력한 이메일이
--    이미 다른 계정에서 쓰이는지 서버가 확인할 때만 쓴다. 로그인한 사용자나 비로그인은 부를 수 없다.
create or replace function public.find_user_id_by_email(p_email text) returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
$$;
revoke all on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;

-- 3) 「이메일 없이 들어온 소셜 계정」이 「이미 있는 이메일 계정」으로 이어 달라고 요청한 기록.
--    이메일 주인이 확인 메일 링크를 누르고 화면에서 직접 승인해야만 이어진다(승인 전에는 아무것도 합쳐지지 않는다).
create table if not exists public.pending_identity_links (
  source_user_id  uuid primary key references auth.users(id) on delete cascade,
  provider        text not null check (char_length(provider) between 1 and 30),
  target_email    text not null check (char_length(target_email) between 3 and 254),
  created_at      timestamptz not null default now()
);
create index if not exists pending_identity_links_email_idx on public.pending_identity_links (target_email, created_at desc);
alter table public.pending_identity_links enable row level security;
-- 정책 없음 → 서버 전용 열쇠만 접근한다.

-- 4) 이메일 확인을 끝내지 않고 떠난 「반쪽 계정」 정리 대상 찾기(서버 전용).
--    이메일이 없고, 기획안이 하나도 없고, 만든 지 p_days일이 지난 계정만 돌려준다.
create or replace function public.list_stale_emailless_users(p_days integer) returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
    from auth.users u
   where u.email is null
     and u.phone is null
     and u.created_at < now() - make_interval(days => greatest(p_days, 1))
     and not exists (select 1 from public.plans p where p.owner_id = u.id)
     and not exists (select 1 from public.admins a where a.user_id = u.id)
   limit 200;
$$;
revoke all on function public.list_stale_emailless_users(integer) from public, anon, authenticated;
grant execute on function public.list_stale_emailless_users(integer) to service_role;
