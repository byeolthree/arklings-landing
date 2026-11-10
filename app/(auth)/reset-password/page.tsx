import { redirect } from "next/navigation";

// 새 비밀번호는 비밀번호 찾기 화면에서 확인 번호를 맞춘 같은 화면에서만 정한다. 이 주소로 직접 들어오면 비밀번호 찾기 화면으로 보낸다.
export default function ResetPasswordPage() {
  redirect("/forgot-password");
}
