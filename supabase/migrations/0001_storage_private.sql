-- 미션7 단계 0: 첨부 파일 보관함을 비공개로 바꾼다.
-- Supabase 화면의 SQL Editor에서 실행한다. 기존 표와 데이터는 건드리지 않고, 여러 번 실행해도 안전하다.
-- 이 뒤로는 파일 주소를 눌러도 열리지 않고, 앱이 만든 임시 주소(5분)로만 볼 수 있다.
-- 비로그인 올리기·읽기·삭제 정책은 단계 2(받는 사람 기준 접근 규칙)에서 정리한다.
update storage.buckets
   set public = false
 where id = 'collab-attachments';
