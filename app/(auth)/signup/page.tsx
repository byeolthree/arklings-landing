import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth-forms";
import { PaperPage } from "@/components/paper-card";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "가입하기", robots: { index: false, follow: false } };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).next;
  const returnTo = safeNext(typeof raw === "string" ? raw : undefined);
  if (await getCurrentUser()) redirect(returnTo);
  return (
    <PaperPage>
      <SignupForm returnTo={returnTo} />
    </PaperPage>
  );
}
