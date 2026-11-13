-- 미션7 크리에이터: 이미지 요소에도 「세부 종류」 태그를 받는다(2026-11-13 아키텍터 지시).
-- Supabase 화면의 SQL Editor에서 실행한다. 기존 데이터는 그대로 두고, 여러 번 실행해도 안전하다.
--
-- 무엇이 바뀌는가
--   · 이미지 요소: 포스터 / 컨셉 / 스토리보드 / B컷 / 기타 를 고를 수 있다.
--   · 영상·문서 요소의 목록은 0012와 같다.
--   · 앱도 같은 목록으로 먼저 거른다(lib/creator-rules.ts 의 IMAGE_SUBKINDS).
--
-- 이 SQL을 실행하지 않으면
--   · 이미지 요소에서 종류 태그를 고르면 「고를 수 없는 종류예요」가 나온다(태그 없이 올리는 것은 된다).

alter table public.creator_work_blocks drop constraint if exists creator_work_blocks_sub_kind;
alter table public.creator_work_blocks add constraint creator_work_blocks_sub_kind check (
  sub_kind is null
  or (kind = 'video' and sub_kind in ('티저', '예고편', '선공개', '파일럿', '피치 영상'))
  or (kind in ('text', 'document') and sub_kind in ('시놉시스', '트리트먼트', '아웃라인', '시리즈 바이블', '파일럿', '피치 문서'))
  or (kind = 'image' and sub_kind in ('포스터', '컨셉', '스토리보드', 'B컷', '기타'))
);
