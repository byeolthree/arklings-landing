import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { PaperPage } from "@/components/paper-card";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "로그인", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).next;
  const returnTo = safeNext(typeof raw === "string" ? raw : undefined);
  // 이미 로그인한 사람은 원래 가려던 화면으로 보낸다.
  if (await getCurrentUser()) redirect(returnTo);
  return (
    <PaperPage>
      <LoginForm returnTo={returnTo} />
    </PaperPage>
  );
}
