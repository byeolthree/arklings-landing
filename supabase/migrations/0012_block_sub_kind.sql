-- 미션7 크리에이터: 작품 요소에 「세부 종류」 칸을 더한다 (시안 01 포트폴리오 등록 화면의 요소 종류 칩, 02·07 접은 목록의 「대표」 칸).
-- Supabase 화면의 SQL Editor에서 0011 다음에 실행한다. 기존 데이터는 지우지 않고(칸이 비어 있는 채로 남는다), 여러 번 실행해도 안전하다.
-- 기준: docs/mockups/01-portfolio-register.png 의 칩 글자, docs/creator-pages-plan.md 0-6.
--
-- 무엇이 바뀌는가
--   · creator_work_blocks 에 sub_kind 칸(비어 있어도 된다)을 더한다.
--       영상 요소: 티저 / 예고편 / 선공개 / 파일럿 / 피치 영상
--       글·문서 요소: 시놉시스 / 트리트먼트 / 아웃라인 / 시리즈 바이블 / 파일럿 / 피치 문서
--       이미지 요소: 세부 종류 없음
--     이 목록 밖의 글자는 DB가 거절한다(앱도 같은 목록으로 먼저 거른다: lib/creator-rules.ts).
--   · 공개용 보기 creator_blocks_public 이 sub_kind 를 함께 돌려주게 한다(보기만 다시 만든다. 기존 칸·권한은 그대로).
--
-- 이 SQL을 실행하지 않으면
--   · 요소 종류 칩을 고르면 「저장하지 못했어요」가 나오고(칩 없이 저장하는 것은 됨),
--   · 마이페이지 접은 목록의 「대표」 칸은 「영상」·「이미지」·「로그라인」으로만 나온다(「티저 영상」은 안 나옴).

-- 1) 칸 더하기 -------------------------------------------------------------------------------
alter table public.creator_work_blocks
  add column if not exists sub_kind text;

alter table public.creator_work_blocks drop constraint if exists creator_work_blocks_sub_kind;
alter table public.creator_work_blocks add constraint creator_work_blocks_sub_kind check (
  sub_kind is null
  or (kind = 'video' and sub_kind in ('티저', '예고편', '선공개', '파일럿', '피치 영상'))
  or (kind in ('text', 'document') and sub_kind in ('시놉시스', '트리트먼트', '아웃라인', '시리즈 바이블', '파일럿', '피치 문서'))
);

-- 2) 공개용 보기: 끝에 칸만 더한다(create or replace view 는 끝에 칸을 더하는 것만 허용한다) ----------------
create or replace view public.creator_blocks_public
with (security_invoker = false) as
select b.id, b.work_id, b.position, b.kind, b.body, b.file_path, b.file_name, b.file_bytes, b.youtube_id, b.sub_kind
  from public.creator_work_blocks b
  join public.creator_works w on w.id = b.work_id
  join public.creator_profiles cp on cp.user_id = w.owner_id
 where w.is_public and w.first_published_at is not null and cp.is_public;

revoke all on public.creator_blocks_public from public, anon, authenticated;
grant select on public.creator_blocks_public to anon, authenticated;
