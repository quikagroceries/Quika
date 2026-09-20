"use client";

import Link from "next/link";
import { BoltMark } from "@/components/marketing/BoltBasket";

/** Shared primary CTA — same control in header, hero, and elsewhere. */
export default function OpenQykaCta({
  className = "",
  label = "Open Qyka",
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
        "inline-flex items-center gap-2 rounded-full bg-brand-orange py-1 pl-1 pr-3 text-[#1A1A1A] transition hover:bg-brand-orange-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold " +
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
