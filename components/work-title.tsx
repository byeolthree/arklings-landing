import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const workTitleClass =
  "font-serif text-xs font-bold leading-[1.3] text-title md:text-base";

type WorkTitleProps = {
  children: ReactNode;
  as?: "p" | "h2" | "h3";
  className?: string;
};

export function WorkTitle({
  children,
  as: Tag = "p",
  className,
}: WorkTitleProps) {
  return <Tag className={cn(workTitleClass, className)}>{children}</Tag>;
}

export { workTitleClass };
