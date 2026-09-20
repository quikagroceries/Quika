"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/marketing/LanguageSwitcher";
import { useT } from "@/lib/locale";

// Deliberately tiny: two destinations, sign in, and the one action. Markets,
// pricing, help and company links live in the footer.
const LINKS = [
  { key: "how", href: "/#how-it-works" },
  { key: "earn", href: "/for-agents" },
] as const;

export default function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const t = useT();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={
        "sticky top-0 z-50 transition-all duration-300 " +
        (scrolled ? "border-b border-line bg-surface/90 shadow-sm backdrop-blur-md" : "border-b border-transparent bg-canvas")
      }
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6">
        <Brand />
        <nav className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden rounded-full px-4 py-2 font-display text-[0.95rem] font-semibold text-ink transition hover:bg-sunken md:inline-flex"
            >
              {t.nav[l.key]}
            </Link>
          ))}
          <LanguageSwitcher className="mr-1 hidden md:inline-flex" />
          <Link
            href="/login"
            className="rounded-full px-3 py-2 font-display text-[0.95rem] font-semibold text-ink transition hover:bg-sunken sm:px-4"
          >
            {t.nav.signIn}
          </Link>
          <Link
            href="/shop"
            className="inline-flex min-h-[44px] items-center rounded-full bg-brand-orange px-5 font-display text-[0.95rem] font-bold text-[#1A1A1A] shadow-sm transition hover:bg-brand-orange-dark active:scale-[0.98]"
          >
            {t.nav.start}
          </Link>
        </nav>
      </div>
    </header>
  );
}
