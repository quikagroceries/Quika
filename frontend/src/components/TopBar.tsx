"use client";

import Image from "next/image";
import logo from "@/assets/logo.png";

function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center px-4 py-2">
        <Image src={logo} alt="Qyka Groceries" className="h-12 w-auto object-contain" />
      </div>
    </header>
  );
}

export default TopBar;
