"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo.png";
import HeaderLocationPicker from "./header/HeaderLocationPicker";

export function MobileHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-3 backdrop-blur-md transition md:hidden">
      {/* Brand logo & Delivery Location */}
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/shop" className="shrink-0" aria-label="Qyka home">
          <Image src={logo} alt="Qyka" className="h-7 w-auto object-contain" priority />
        </Link>
        <div className="max-w-[140px] sm:max-w-[200px]">
          <HeaderLocationPicker className="scale-90 origin-left" />
        </div>
      </div>

      {/* Right utilities: the menu button ONLY on
          layouts without a bottom tab bar (admin) - where there IS one,
          the drawer would just repeat its five destinations. */}
      <div className="flex shrink-0 items-center gap-1.5">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-sunken-2 active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}

export default MobileHeader;
