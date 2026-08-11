"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BoltMark } from "@/components/marketing/BoltBasket";
import { QUIKA_LOGO_CACHE_KEY, QUIKA_LOGO_DATA_URI } from "@/components/marketing/logoData";
import { hashFromHref, scrollToSection } from "@/lib/scrollToSection";

type NavItem =
  | { kind: "anchor"; id: string; label: string; href: string }
  | { kind: "route"; id: string; label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { kind: "anchor", id: "how", label: "How It Works", href: "/#how" },
  { kind: "route", id: "markets", label: "Markets", href: "/markets" },
  { kind: "route", id: "for-agents", label: "For Agents", href: "/for-agents" },
  { kind: "route", id: "about", label: "About Us", href: "/about" },
  { kind: "route", id: "trust", label: "Trust & Safety", href: "/trust-and-safety" },
];

function NavLink({
  href,
  label,
  active,
  onClick,
  mobile = false,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const className = mobile
    ? "block rounded-xl px-3 py-3 text-base font-semibold transition-colors " +
      (active ? "bg-canvas text-ink" : "text-ink/70 hover:bg-canvas hover:text-ink")
    : "relative pb-2 text-sm font-semibold transition-colors " +
      (active ? "text-ink" : "text-ink/55 hover:text-ink");

  const underline = !mobile ? (
    <span
      aria-hidden
      className={
        "absolute bottom-0 left-1/2 h-[3px] w-[1.1rem] -translate-x-1/2 rounded-full bg-brand-orange transition-opacity " +
        (active ? "opacity-100" : "opacity-0")
      }
    />
  ) : null;

  const hash = hashFromHref(href);

  function handleHashClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!hash) return;

    // Already on the marketing home — smooth-scroll in place
    if (pathname === "/") {
      e.preventDefault();
      scrollToSection(hash);
      window.history.pushState(null, "", `/#${hash}`);
      onClick?.();
      return;
    }

    // Coming from another page — land on home, then scroll
    e.preventDefault();
    sessionStorage.setItem("quika-scroll-to", hash);
    onClick?.();
    router.push(`/#${hash}`);
  }

  if (hash) {
    return (
      <a
        href={href}
        onClick={handleHashClick}
        aria-current={active ? "page" : undefined}
        className={className}
      >
        {label}
        {underline}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={className}>
      {label}
      {underline}
    </Link>
  );
}

export default function MarketingHeader() {
  const pathname = usePathname();
  const [howActive, setHowActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") {
      setHowActive(false);
      return undefined;
    }

    const el = document.getElementById("how");
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setHowActive(Boolean(entry?.isIntersecting)),
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.25, 0.5] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function isActive(item: NavItem) {
    if (item.kind === "anchor") return howActive;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <header className="sticky top-0 z-40 mx-auto max-w-6xl rounded-b-3xl bg-white shadow-sm">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="relative z-[1] flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={QUIKA_LOGO_CACHE_KEY}
            src={QUIKA_LOGO_DATA_URI}
            alt="Quika Groceries"
            width={120}
            height={88}
            className="h-11 w-auto object-contain"
          />
        </Link>

        <nav
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 lg:gap-10 md:flex"
          aria-label="Primary"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.id} href={item.href} label={item.label} active={isActive(item)} />
          ))}
        </nav>

        <div className="relative z-[1] flex items-center gap-2">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-full bg-brand-green py-1 pl-1 pr-3 text-white transition hover:bg-brand-green/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <BoltMark className="h-9 w-9" iconClassName="h-[48%] w-[48%]" />
            <span className="hidden text-sm font-bold sm:inline">Open Quika</span>
          </Link>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            aria-expanded={menuOpen}
            aria-controls="mobile-marketing-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-marketing-nav"
          className="border-t border-ink/5 px-4 pb-4 pt-2 md:hidden sm:px-6"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.id}
                href={item.href}
                label={item.label}
                active={isActive(item)}
                mobile
                onClick={() => setMenuOpen(false)}
              />
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand-green px-4 text-sm font-bold text-white"
            >
              Open Quika
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
