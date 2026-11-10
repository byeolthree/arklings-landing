-- 미션7 크리에이터: 프로필 「대표 이미지·영상」 파일도 사람당 파일 합계 20MB에 센다 (별뜨리님 지시 2026-11-09, 계획 문서 0-4 v).
-- Supabase 화면의 SQL Editor에서 0013 다음에 실행한다. 기존 데이터는 지우지 않고(지금 대표 파일이 올라와 있지 않아도 상관없다), 여러 번 실행해도 안전하다.
-- 0009가 이미 만든 것: 프로필의 hero_kind·hero_path·hero_bytes 칸, 경로 검사(jpg·png·webp·mp4), 보관함 creator-works(mp4 허용, 파일당 10MB). 이 SQL은 그 위에 한도만 더한다.
--
-- 무엇이 바뀌는가
--   · 대표 파일의 종류별 크기를 DB도 막는다: 이미지 5MB 이하(jpg·png·webp), 영상 10MB 이하(mp4).
--   · 대표 파일의 크기를 작품 요소 파일(이미지·PDF)과 합쳐 20MB를 넘지 못하게 한다.
--       - 대표 파일을 올리거나 바꿀 때: (작품 요소 파일 합계 + 새 대표 파일) 검사
--       - 작품 요소 파일을 더할 때: (다른 요소 파일 합계 + 대표 파일 + 새 요소 파일) 검사 (0009의 함수를 같은 이름으로 다시 만든다)
--
-- 이 SQL을 실행하지 않아도 화면은 그대로 동작한다. 서버 동작(app/actions/creators.ts)이 같은 한도를 먼저 세고 막는다.
-- 실행하면 서버 동작을 거치지 않고 DB를 직접 열어도 같은 한도가 막힌다(DB가 한 번 더 막는 안전장치).

-- 1) 대표 파일의 종류별 크기·확장자 ---------------------------------------------------------------
alter table public.creator_profiles drop constraint if exists creator_profiles_hero_limits;
alter table public.creator_profiles add constraint creator_profiles_hero_limits check (
  hero_kind is null
  or (hero_kind = 'image' and hero_bytes <= 5242880  and hero_path ~ '\.(jpg|png|webp)$')
  or (hero_kind = 'video' and hero_bytes <= 10485760 and hero_path ~ '\.mp4$')
);

-- 2) 대표 파일을 올릴 때: 작품 요소 파일 합계와 함께 20MB -------------------------------------------
create or replace function public.creator_profiles_hero_quota() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_used bigint;
begin
  if new.hero_bytes is not null then
    select coalesce(sum(b.file_bytes), 0) into v_used
      from public.creator_work_blocks b
     where b.owner_id = new.user_id;
    if v_used + new.hero_bytes > 20971520 then
      raise exception 'file_quota_exceeded';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists creator_profiles_hero_quota_check on public.creator_profiles;
create trigger creator_profiles_hero_quota_check
  before insert or update on public.creator_profiles
  for each row execute function public.creator_profiles_hero_quota();

-- 3) 작품 요소 파일을 더할 때: 대표 파일도 합계에 센다(0009의 함수를 같은 이름으로 다시 만든다) ----------
create or replace function public.creator_work_blocks_before() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_used  bigint;
  v_hero  bigint;
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
    select coalesce(cp.hero_bytes, 0) into v_hero
      from public.creator_profiles cp
     where cp.user_id = new.owner_id;
    if v_used + coalesce(v_hero, 0) + new.file_bytes > 20971520 then
      raise exception 'file_quota_exceeded';
    end if;
  end if;
  return new;
end $$;
