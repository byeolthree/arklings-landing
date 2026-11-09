-- 미션7 크리에이터: 로그라인도 다른 요소처럼 옮길 수 있게, 작품에 「로그라인 위치」 칸을 더한다 (D35-2, 시안 01 포트폴리오 등록 화면).
-- Supabase 화면의 SQL Editor에서 0012 다음에 실행한다. 기존 작품은 지우지 않고 칸 값이 0(= 지금처럼 맨 위)으로 남고, 여러 번 실행해도 안전하다.
-- 기준: docs/mockups/01-portfolio-register.png 의 C 화면, docs/creator-pages-plan.md D35-2.
--
-- 무엇이 바뀌는가
--   · creator_works 에 logline_position 칸(0 이상 20 이하의 정수, 기본값 0)을 더한다.
--     「이 작품의 로그라인 앞에 요소가 몇 개 있는가」를 뜻한다. 0이면 로그라인이 맨 위이고, 값이 요소 개수보다 크면 화면이 맨 아래로 본다.
--     맨 위에 놓인 것(로그라인이든 요소든)이 그 작품의 「대표」다.
--   · 공개용 보기 creator_works_public 이 logline_position 을 함께 돌려주게 한다(보기만 다시 만든다. 기존 칸·권한은 그대로).
--
-- 이 SQL을 실행하지 않으면
--   · 로그라인을 끌어서 옮기면 「저장하지 못했어요」가 나오고(옮기지 않은 저장은 됨),
--   · 공개 작품 창과 마이페이지 접은 목록의 「대표」 칸은 로그라인을 항상 맨 위로 본다.

-- 1) 칸 더하기 -------------------------------------------------------------------------------
alter table public.creator_works
  add column if not exists logline_position integer not null default 0;

alter table public.creator_works drop constraint if exists creator_works_logline_position;
alter table public.creator_works add constraint creator_works_logline_position
  check (logline_position between 0 and 20);

-- 2) 공개용 보기: 끝에 칸만 더한다(create or replace view 는 끝에 칸을 더하는 것만 허용한다) ----------------
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
  w.sort_order,
  w.logline_position
from public.creator_works w
join public.creator_profiles cp on cp.user_id = w.owner_id
left join public.profiles pr on pr.id = w.owner_id
where w.is_public and w.first_published_at is not null and cp.is_public;

revoke all on public.creator_works_public from public, anon, authenticated;
grant select on public.creator_works_public to anon, authenticated;
