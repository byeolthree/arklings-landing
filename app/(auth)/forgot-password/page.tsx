import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/password-forms";
import { PaperPage } from "@/components/paper-card";

export const metadata: Metadata = { title: "비밀번호 찾기", robots: { index: false, follow: false } };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = sp.email;
  return (
    <PaperPage>
      <ForgotPasswordForm initialEmail={typeof raw === "string" ? raw.slice(0, 254) : undefined} expired={sp.expired === "1"} />
    </PaperPage>
  );
}
