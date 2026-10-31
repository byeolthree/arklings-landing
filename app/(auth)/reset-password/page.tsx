import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/password-forms";
import { PaperPage } from "@/components/paper-card";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "새 비밀번호", robots: { index: false, follow: false } };

export default async function ResetPasswordPage() {
  // 메일 링크를 눌러 로그인된 상태에서만 열린다. 아니면 설정 메일을 다시 받도록 보낸다.
  if (!(await getCurrentUser())) redirect("/auth/link-expired?next=%2Freset-password");
  return (
    <PaperPage>
      <ResetPasswordForm />
    </PaperPage>
  );
}
