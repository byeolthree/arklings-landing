-- 미션7 단계 1: 공개 프로필 표와 가입 때 자동 생성.
-- Supabase 화면의 SQL Editor에서 실행한다. 기존 표와 데이터는 건드리지 않고, 여러 번 실행해도 안전하다.
--
-- 로그인 정보(이메일·비밀번호·로그인 방식)는 Supabase가 관리하는 auth.users에 있다.
-- 아래 표들은 그와 "다른 칸"이다.
--   profiles          : 남에게 보여 주는 공개 정보(공개 이름). 이메일은 복사해 두지 않는다.
--   profile_consents  : 개인정보 동의 기록(본인만 볼 수 있다).

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- 1) 공개 프로필
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,  -- 가입 때 자동으로 생기는 고유번호(UUID)
  display_name  text not null check (char_length(display_name) between 1 and 30),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- 읽기: 누구나(공개 이름만 들어 있다). 쓰기: 본인 줄만.
drop policy if exists "profiles read all" on public.profiles;
create policy "profiles read all" on public.profiles
  for select to anon, authenticated using (true);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 2) 동의 기록(본인만 읽기). 가입할 때 앱이 보낸 문구 버전을 그대로 적는다.
create table if not exists public.profile_consents (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  consent_version  text not null,
  consented_at     timestamptz not null default now()
);

alter table public.profile_consents enable row level security;

drop policy if exists "consents read own" on public.profile_consents;
create policy "consents read own" on public.profile_consents
  for select to authenticated using (user_id = auth.uid());

-- 3) 가입하면 프로필(과 동의 기록)을 자동으로 만든다.
--    공개 이름: 가입 화면에서 입력한 이름 → (소셜 로그인이면) 소셜이 준 이름 → 없으면 「회원 + 번호 4자리」.
create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name    text;
  v_consent text;
begin
  -- 빈 문자열("")은 건너뛰고 다음 후보를 쓴다.
  v_name := left(
    coalesce(
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), '')
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) 이 SQL을 실행하기 전에 이미 가입한 사람이 있다면 프로필을 채워 둔다.
insert into public.profiles (id, display_name)
select u.id, '회원 ' || left(replace(u.id::text, '-', ''), 4)
from auth.users u
on conflict (id) do nothing;
