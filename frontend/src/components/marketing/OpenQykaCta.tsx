"use client";

import Link from "next/link";
import { BoltMark } from "@/components/marketing/BoltBasket";

/** Shared primary CTA — same control in header, hero, and elsewhere. */
export default function OpenQuikaCta({
  className = "",
  label = "Open Quika",
  labelClassName = "text-sm font-bold",
  alwaysShowLabel = false,
  onClick,
}: {
  className?: string;
  label?: string;
  labelClassName?: string;
  /** When false, label hides below `sm` (header density). */
  alwaysShowLabel?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href="/shop"
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-full bg-brand-green py-1 pl-1 pr-3 text-white transition hover:bg-brand-green/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold " +
        className
      }
    >
      <BoltMark className="h-9 w-9" iconClassName="h-[48%] w-[48%]" />
      <span className={alwaysShowLabel ? labelClassName : "hidden " + labelClassName + " sm:inline"}>
        {label}
      </span>
    </Link>
  );
}
