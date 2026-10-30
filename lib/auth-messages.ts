// Supabase가 돌려주는 영어 오류를 쉬운 한국어로 바꾼다. 영어 문구를 화면에 그대로 보이지 않는다.
export type AuthIssue = {
  message: string;
  // 이 오류에서 화면이 보여 줄 "다음에 할 일" 버튼 종류
  next: "retry" | "resend" | "signup" | "later";
  field?: "email" | "password";
};

type ErrorLike = { code?: string; status?: number; message?: string; name?: string } | null | undefined;

export function describeAuthError(error: ErrorLike, context: "signup" | "login" | "resend"): AuthIssue {
  const code = error?.code;
  const status = error?.status;

  switch (code) {
    case "invalid_credentials":
      return { message: "이메일 또는 비밀번호가 맞지 않아요. 다시 입력하거나, 아직 가입 전이라면 가입해 주세요.", next: "signup" };
    case "email_not_confirmed":
      return { message: "아직 이메일 확인이 끝나지 않았어요. 받은 편지함(스팸함도)에서 확인 메일의 링크를 눌러 주세요.", next: "resend" };
    case "weak_password":
      return { message: "비밀번호가 너무 쉬워요. 8자 이상으로 영문과 숫자를 섞어 주세요.", next: "retry", field: "password" };
    case "email_address_invalid":
    case "validation_failed":
      return { message: "이메일 주소를 다시 확인해 주세요.", next: "retry", field: "email" };
    case "email_address_not_authorized":
      return { message: "지금은 이 이메일 주소로 확인 메일을 보낼 수 없어요. 메일 발송 설정이 끝나면 다시 시도해 주세요.", next: "later" };
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return { message: "짧은 시간에 너무 많이 요청했어요. 잠시(1~2분) 뒤에 다시 시도해 주세요.", next: "later" };
    case "signup_disabled":
    case "email_provider_disabled":
      return { message: "지금은 이메일로 가입할 수 없어요. 잠시 뒤에 다시 시도해 주세요.", next: "later" };
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "bad_code_verifier":
      return { message: "확인 링크가 만료되었거나 이미 사용됐어요. 새 확인 메일을 받아 주세요.", next: "resend" };
    case "user_banned":
      return { message: "이 계정은 지금 사용할 수 없어요.", next: "later" };
    default:
      break;
  }

  if (status === 429) {
    return { message: "짧은 시간에 너무 많이 요청했어요. 잠시(1~2분) 뒤에 다시 시도해 주세요.", next: "later" };
  }
  if (status === 0 || status === undefined || (status !== undefined && status >= 500)) {
    return { message: "서버와 연결이 잘 되지 않아요. 잠시 뒤에 다시 시도해 주세요.", next: "retry" };
  }
  const fallback =
    context === "signup"
      ? "가입을 마치지 못했어요. 입력한 내용을 확인하고 다시 시도해 주세요."
      : context === "resend"
        ? "확인 메일을 보내지 못했어요. 잠시 뒤에 다시 시도해 주세요."
        : "로그인하지 못했어요. 잠시 뒤에 다시 시도해 주세요.";
  return { message: fallback, next: "retry" };
}
