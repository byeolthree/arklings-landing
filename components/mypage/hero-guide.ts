// 크리에이터 「대표 이미지·영상」 칸의 받는 파일 규칙과 영상 변환 프롬프트 글. 샘플(mypage-preview.tsx)과 실제 화면(creator-forms.tsx)이 같은 글을 쓰도록 한 곳에 둔다.
// 받는 파일(별뜨리님 지시 2026-11-05, 이미지는 D17·D19): 이미지 JPG·PNG·WEBP 5MB 이하, 영상 MP4(H.264) 10MB 이하. 계획 문서 0-4 v.
export const HERO_RULE = {
  image: { types: ["image/jpeg", "image/png", "image/webp"], max: 5 * 1024 * 1024, accept: "image/jpeg,image/png,image/webp", hint: "JPG, PNG, WEBP · 5MB 이하" },
  video: { types: ["video/mp4"], max: 10 * 1024 * 1024, accept: "video/mp4", hint: "MP4(H.264) · 10MB 이하 · 가로 1280×720(16:9) · 15~30초 · 소리는 AAC" },
} as const;

export const VIDEO_PROMPT = `첨부한 영상을 웹사이트 프로필 맨 위에 거는 「대표 영상」으로 변환해 줘.

[출력 형식]
- 파일 형식: MP4 (컨테이너 MP4, 영상 H.264, 소리 AAC)
- 화면 비율: 16:9 가로. 검은 띠(레터박스)를 새로 넣지 말고 원본 비율을 그대로 유지
- 해상도: 가로 1280 × 세로 720 (1080p 이상으로 만들지 말 것)
- 초당 장면 수: 30 (원본이 더 높아도 30으로)
- 길이: 15~30초. 길면 가장 인상적인 구간 하나만 자르고, 페이드 인/아웃은 넣지 않음(반복 재생됨)
- 영상 비트레이트: 약 1.5 Mbps (최대 2.5 Mbps)
- 소리: AAC 스테레오 96 kbps. 소리 없는 구간이 있어도 소리 트랙은 남길 것
- 파일 용량: 6MB 이하 (절대 10MB를 넘지 말 것)
- 인터넷에서 바로 재생되게 「faststart」(moov atom을 앞쪽으로) 옵션을 켤 것
- 자막, 로고, 워터마크, 글자를 영상에 새로 입히지 말 것

[확인 후 알려 줄 것]
- 최종 해상도, 길이, 용량(MB), 영상·소리 비트레이트, 초당 장면 수
- 원본에서 자른 구간(시작~끝 시간)`;
