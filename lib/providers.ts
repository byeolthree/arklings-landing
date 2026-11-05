// 로그인 방식 목록. 새 방식(예: 네이버)은 여기에 한 줄 더하고 Supabase 쪽 설정만 켜면 화면 버튼·마이페이지 표시가 따라온다.
export const OAUTH_PROVIDERS = [
  { id: "google", label: "구글" },
  { id: "kakao", label: "카카오" },
] as const;

export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number]["id"];

export const PROVIDER_LABEL: Record<string, string> = {
  email: "이메일·비밀번호",
  ...Object.fromEntries(OAUTH_PROVIDERS.map((p) => [p.id, p.label])),
};

export function isOAuthProvider(v: unknown): v is OAuthProviderId {
  return typeof v === "string" && OAUTH_PROVIDERS.some((p) => p.id === v);
}

// 제공자마다 달라야 하는 요청 옵션.
// 카카오는 닉네임·프로필 사진만 받기로 했으므로 이메일 권한(account_email)을 요청하지 않는다
// (앱에 없는 권한을 요청하면 카카오가 로그인을 거부한다).
export function oauthOptions(provider: OAuthProviderId): { scopes?: string; queryParams?: Record<string, string> } {
  // Supabase는 카카오 요청에 기본으로 account_email을 붙이고, scopes 옵션은 거기에 더해질 뿐이다. 그래서 scope를 queryParams로 지정해 최종 범위를 직접 정한다.
  if (provider === "kakao") return { queryParams: { scope: "profile_nickname profile_image" } };
  return {};
}
