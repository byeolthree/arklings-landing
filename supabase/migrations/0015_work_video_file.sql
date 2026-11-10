-- 미션7 크리에이터: 작품 안 영상 요소에 MP4 파일을 올릴 수 있게 한다 (아키텍터 결정 2026-11-09, D18 「영상 파일 직접 올리기는 이번에 하지 않는다」 개정, 시안 01 포트폴리오 등록 화면).
-- Supabase 화면의 SQL Editor에서 0014 다음에 실행한다. 기존 요소는 지우지 않고(지금 영상 요소는 모두 유튜브 주소라 그대로 통과한다), 여러 번 실행해도 안전하다.
-- 기준: 0009(요소 표·검사·보관함 creator-works는 mp4 허용, 파일당 10MB), 0014(합계 20MB 검사 함수는 file_bytes가 있는 요소를 모두 센다 → 영상 파일도 자동으로 센다).
--
-- 무엇이 바뀌는가
--   · 영상 요소(kind=video)가 둘 중 하나를 가질 수 있다.
--       ① 유튜브 주소(youtube_id)만 — 지금과 같다.
--       ② MP4 파일(file_path는 .mp4, file_bytes는 10MB 이하)만.
--     (둘을 함께 가질 수는 없다. 이미지·PDF·글 요소의 규칙은 그대로다.)
--   · 요소 파일 경로 검사에 mp4를 더한다(영상 요소만 mp4를 가질 수 있다).
--
-- 이 SQL을 실행하지 않으면
--   · 영상 요소에 MP4 파일을 올리려 하면 「데이터베이스 준비(0015)가 먼저 필요해요」 안내가 나오고 올라가지 않는다(유튜브 주소로 넣는 것은 그대로 된다).

-- 1) 요소 파일 경로: mp4 허용 --------------------------------------------------------------------
alter table public.creator_work_blocks drop constraint if exists creator_work_blocks_file_path_check;
alter table public.creator_work_blocks drop constraint if exists creator_work_blocks_file_path_format;
alter table public.creator_work_blocks add constraint creator_work_blocks_file_path_format
  check (file_path is null or file_path ~ '^[0-9a-f-]{36}\.(jpg|png|webp|pdf|mp4)$');

-- 2) 요소 모양: 영상은 유튜브 주소 또는 MP4 파일 ---------------------------------------------------
alter table public.creator_work_blocks drop constraint if exists creator_work_blocks_shape;
alter table public.creator_work_blocks add constraint creator_work_blocks_shape check (
  (kind = 'text'     and body is not null and btrim(body) <> '' and file_path is null and file_bytes is null and youtube_id is null)
  or (kind = 'image' and file_path is not null and file_bytes is not null and file_bytes <= 5242880 and file_path !~ '\.mp4$' and body is null and youtube_id is null)
  or (kind = 'document' and file_path is not null and file_bytes is not null and file_bytes <= 10485760 and file_path !~ '\.mp4$' and body is null and youtube_id is null)
  or (kind = 'video' and body is null and (
        (youtube_id is not null and file_path is null and file_bytes is null)
        or (youtube_id is null and file_path is not null and file_path ~ '\.mp4$' and file_bytes is not null and file_bytes <= 10485760)
     ))
);
