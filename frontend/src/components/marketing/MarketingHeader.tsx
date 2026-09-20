"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import OpenQykaCta from "@/components/marketing/OpenQykaCta";
import { QYKA_LOGO_CACHE_KEY, QYKA_LOGO_DATA_URI } from "@/components/marketing/logoData";
import { hashFromHref, scrollToSection } from "@/lib/scrollToSection";

type NavItem = { id: string; label: string; href: string; hash?: boolean };

// Exactly 5, arranged to read as two groups either side of a bridge: "Agent"/
// "Rider" (the two ways to earn) — FAQ (answers either side might have) —
// "Trust"/"About" (the two ways to learn about us). Help lives in the
// floating HelpWidget on every page instead of taking a nav slot.
const NAV_ITEMS: NavItem[] = [
  { id: "for-agents", label: "Agent", href: "/for-agents" },
  { id: "for-riders", label: "Rider", href: "/for-riders" },
  { id: "faq", label: "FAQ", href: "/#faq", hash: true },
  { id: "trust", label: "Trust", href: "/trust-and-safety" },
  { id: "about", label: "About", href: "/about" },
];

export default function MarketingHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const pillRef = useRef<HTMLSpanElement>(null);

  function isActive(item: NavItem) {
    if (item.hash) return false; // a same-page section, never "the current page"
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  const activeItem = NAV_ITEMS.find(isActive) || null;

  function handleHashClick(e: MouseEvent<HTMLAnchorElement>, href: string, after?: () => void) {
    const hash = hashFromHref(href);
    if (!hash) return;
    e.preventDefault();
    if (pathname === "/") {
      scrollToSection(hash);
      window.history.pushState(null, "", `/#${hash}`);
    } else {
      sessionStorage.setItem("qyka-scroll-to", hash);
      router.push(`/#${hash}`);
    }
    after?.();
  }

  useEffect(() => {
    setMenuOpen(false);
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sliding pill indicator — sits behind whichever nav link is active (and
  // magnet-slides to whatever's hovered), instead of a static underline.
  function movePillTo(id: string | null, animate: boolean) {
    const pill = pillRef.current;
    const nav = navRef.current;
    if (!pill || !nav) return;
    if (!id) {
      gsap.to(pill, { opacity: 0, duration: 0.2, ease: "power2.out" });
      return;
    }
    const el = itemRefs.current.get(id);
    if (!el) return;
    const navBox = nav.getBoundingClientRect();
    const elBox = el.getBoundingClientRect();
    const x = elBox.left - navBox.left;
    if (animate) {
      gsap.to(pill, { x, width: elBox.width, opacity: 1, duration: 0.4, ease: "power3.out" });
    } else {
      gsap.set(pill, { x, width: elBox.width, opacity: 1 });
    }
  }

  useLayoutEffect(() => {
    movePillTo(activeItem?.id ?? null, false);
    const onResize = () => movePillTo(activeItem?.id ?? null, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <header
      className={
        "sticky top-0 z-40 mx-auto max-w-6xl rounded-b-3xl transition-all duration-300 " +
        (scrolled
          ? "bg-white/90 shadow-[0_12px_32px_rgba(33,26,20,0.14)] backdrop-blur-md"
          : "bg-white shadow-sm")
      }
    >
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-5">
        <Link href="/" className="relative z-[1] flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={QYKA_LOGO_CACHE_KEY}
            src={QYKA_LOGO_DATA_URI}
            alt="Qyka Groceries"
            width={120}
            height={88}
            className="h-12 w-auto object-contain"
          />
        </Link>

        <nav
          ref={navRef}
          className="relative hidden items-center gap-1 md:flex"
          aria-label="Primary"
          onMouseLeave={() => movePillTo(activeItem?.id ?? null, true)}
        >
          <span
            ref={pillRef}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-canvas opacity-0"
          />
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const className =
              "relative z-[1] rounded-full px-4 py-2 text-sm font-bold transition-colors " +
              (active ? "text-ink" : "text-ink/55 hover:text-ink");
            const refCallback = (el: HTMLAnchorElement | null) => {
              if (el) itemRefs.current.set(item.id, el);
            };
            if (item.hash) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  ref={refCallback}
                  onMouseEnter={() => movePillTo(item.id, true)}
                  onClick={(e) => handleHashClick(e, item.href)}
                  className={className}
                >
                  {item.label}
                </a>
              );
            }
            return (
              <Link
                key={item.id}
                href={item.href}
                ref={refCallback}
                onMouseEnter={() => movePillTo(item.id, true)}
                aria-current={active ? "page" : undefined}
                className={className}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-[1] flex items-center gap-2">
          <OpenQykaCta label="Start Shopping" />

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
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const className =
                "block rounded-xl px-3 py-3 text-base font-semibold transition-colors " +
                (active ? "bg-canvas text-ink" : "text-ink/70 hover:bg-canvas hover:text-ink");
              if (item.hash) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={(e) => handleHashClick(e, item.href, () => setMenuOpen(false))}
                    className={className}
                  >
                    {item.label}
                  </a>
                );
              }
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={className}
                >
                  {item.label}
                </Link>
              );
            })}
            <OpenQykaCta
              label="Start Shopping"
              className="mt-2 min-h-[44px] justify-center self-stretch pr-4"
              alwaysShowLabel
              onClick={() => setMenuOpen(false)}
            />
          </nav>
        </div>
      )}
    </header>
  );
}
