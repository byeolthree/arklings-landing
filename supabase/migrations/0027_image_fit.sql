-- 미션7 크리에이터: 이미지 요소마다 「카드에 보일 때 꽉 채우기 / 여백 두기」를 고를 수 있게 한다(2026-11-13 아키텍터 지시).
-- Supabase 화면의 SQL Editor에서 실행한다. 기존 데이터는 그대로 두고(비어 있으면 여백 두기), 여러 번 실행해도 안전하다.
--   · cover   = 칸을 꽉 채운다(그림 가장자리가 조금 잘릴 수 있다)
--   · contain = 그림을 자르지 않고 남는 곳을 카드 배경색으로 둔다(비어 있을 때도 이것)
alter table public.creator_work_blocks add column if not exists fit text;
alter table public.creator_work_blocks drop constraint if exists creator_work_blocks_fit;
alter table public.creator_work_blocks add constraint creator_work_blocks_fit check (fit is null or (kind = 'image' and fit in ('cover', 'contain')));

-- 공개용 보기: 끝에 fit 칸만 더한다(기존 칸·조건·권한은 0012와 같다)
create or replace view public.creator_blocks_public
with (security_invoker = false) as
select b.id, b.work_id, b.position, b.kind, b.body, b.file_path, b.file_name, b.file_bytes, b.youtube_id, b.sub_kind, b.fit
  from public.creator_work_blocks b
  join public.creator_works w on w.id = b.work_id
  join public.creator_profiles cp on cp.user_id = w.owner_id
 where w.is_public and w.first_published_at is not null and cp.is_public;

revoke all on public.creator_blocks_public from public, anon, authenticated;
grant select on public.creator_blocks_public to anon, authenticated;
