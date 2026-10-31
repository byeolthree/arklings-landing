import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/password-forms";
import { PaperPage } from "@/components/paper-card";

export const metadata: Metadata = { title: "비밀번호 설정", robots: { index: false, follow: false } };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).email;
  return (
    <PaperPage>
      <ForgotPasswordForm initialEmail={typeof raw === "string" ? raw.slice(0, 254) : undefined} />
    </PaperPage>
  );
}
