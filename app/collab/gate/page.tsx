import type { Metadata } from "next";
import { GateForm } from "@/components/gate-form";
import { PaperPage } from "@/components/paper-card";
import { safeGateNext } from "@/lib/admin-gate";

export const metadata: Metadata = { title: "운영자 확인", robots: { index: false, follow: false } };

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).next;
  const next = safeGateNext(typeof raw === "string" ? raw : undefined);
  return (
    <PaperPage>
      <GateForm next={next} />
    </PaperPage>
  );
}
