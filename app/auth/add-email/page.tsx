import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AddEmailForm } from "@/components/add-email-form";
import { PaperPage } from "@/components/paper-card";
import { getCurrentUser } from "@/lib/auth";
import { PROVIDER_LABEL } from "@/lib/providers";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "이메일 확인", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AddEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).next;
  const returnTo = safeNext(typeof raw === "string" ? raw : undefined);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (user.email && user.emailConfirmed) redirect(returnTo);
  const providerId = user.providers.find((p) => p !== "email");
  return (
    <PaperPage>
      <AddEmailForm returnTo={returnTo} providerLabel={(providerId && PROVIDER_LABEL[providerId]) || "소셜"} />
    </PaperPage>
  );
}
