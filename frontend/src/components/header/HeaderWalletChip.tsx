"use client";

import Link from "next/link";
import { useWalletBalance } from "@/lib/useWalletBalance";

export function HeaderWalletChip({ className = "" }: { className?: string }) {
  const { balance, loading } = useWalletBalance();

  const formatted =
    balance != null
      ? `₦${Number(balance).toLocaleString("en-NG", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}`
      : "₦0";

  return (
    <Link
      href="/wallet"
      className={`group flex h-10 min-w-[7rem] items-center gap-2 rounded-full border border-line bg-surface px-3.5 shadow-xs transition hover:border-line-strong hover:bg-sunken-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 ${className}`}
      aria-label={`Wallet balance: ${formatted}`}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunken-2 text-muted transition group-hover:bg-brand-orange/15 group-hover:text-brand-orange-dark">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M16 12h.01" strokeWidth="3" strokeLinecap="round" />
          <path d="M2 10h20" />
        </svg>
      </div>

      <div className="text-left">
        <span className="block text-[9px] font-bold uppercase tracking-wider text-muted">
          Wallet
        </span>
        <span className="block font-sans text-xs font-extrabold text-ink">
          {loading ? "…" : formatted}
        </span>
      </div>
    </Link>
  );
}

export default HeaderWalletChip;
