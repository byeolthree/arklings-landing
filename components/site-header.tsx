"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { extraNavItems, myPageItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && !document.getElementById(menuId)?.contains(target)) {
        const toggle = document.querySelector('[aria-controls="' + menuId + '"]');
        if (toggle?.contains(target)) return;
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, menuId]);

  return (
    <header className="border-b border-teal bg-background">
      <div className="mx-auto flex w-full max-w-[1440px] items-center px-4 py-4 md:gap-8 md:px-20 md:py-6">
        <Link
          href="/"
          className="font-sans text-[22px] font-bold leading-normal text-jaju md:text-2xl"
        >
          Arklings
        </Link>
        <nav
          className="hidden flex-1 items-center gap-8 md:flex"
          aria-label="주요 메뉴"
        >
          {extraNavItems.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "text-[15px] leading-normal",
                  pathname.startsWith(item.href)
                    ? "font-normal text-title"
                    : "text-body",
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span key={item.label} className="text-[15px] text-body">
                {item.label}
              </span>
            ),
          )}
          <span className="flex-1" />
          <span className="text-[15px] text-body">{myPageItem.label}</span>
          <Link
            href="/apply"
            className={cn(
              buttonVariants(),
              "h-8 rounded-lg bg-jaju px-5 py-2 text-[13px] font-bold text-white hover:bg-jaju/90",
            )}
          >
            협업 신청
          </Link>
        </nav>
        <div className="ml-auto md:hidden">
          <button
            type="button"
            className="text-[18px] leading-none text-title"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">메뉴 {open ? "닫기" : "열기"}</span>
            ☰
          </button>
        </div>
      </div>
      {open ? (
        <div
          id={menuId}
          className="border-t border-teal px-4 py-4 md:hidden"
        >
          <nav className="flex flex-col gap-3" aria-label="모바일 메뉴">
            <Link href="/" className="text-[15px] text-title" onClick={() => setOpen(false)}>
              홈
            </Link>
            <Link
              href="/studio"
              className="text-[15px] text-title"
              onClick={() => setOpen(false)}
            >
              스튜디오
            </Link>
            <Link
              href="/apply"
              className="text-[15px] font-bold text-jaju"
              onClick={() => setOpen(false)}
            >
              협업 신청
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
