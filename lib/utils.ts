// 여러 파일이 똑같은 모양으로 따로 갖고 있던 작은 도우미와 정규식을 한 곳에 모았다(2026-11-14 정리). 동작은 원래 코드와 같다.

// UUID(기획안·작품·신청 번호) 모양
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 이메일 모양(가입·로그인·비밀번호·협업 신청 답장·알림 메일이 같이 쓴다)
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 글에 넣을 수 없는 제어 문자(줄바꿈·탭은 허용). 기획안·AI 평가 결과·라이브러리 질문이 같이 쓴다.
export const FORBIDDEN_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

// 배열이 아닌 객체인지
export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// 주소의 값(?key=값)이 여러 개 오면 첫 값만 쓴다
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// 폼 칸의 글자(없으면 빈 글자)
export const formText = (fd: FormData, key: string) => String(fd.get(key) ?? "");
