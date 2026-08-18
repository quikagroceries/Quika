"use client";

import Image from "next/image";
import logo from "@/assets/logo.png";

function MobileHeader({ onMenuClick }: any) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink/8 bg-canvas/90 px-4 py-3 backdrop-blur-md md:hidden">
      <Image src={logo} alt="Quika Groceries" className="h-9 w-auto object-contain" />
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-11 w-11 items-center justify-center rounded-2xl text-ink hover:bg-ink/5 active:bg-ink/10"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </header>
  );
}

export default MobileHeader;
