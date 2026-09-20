"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent } from "react";
import OpenQykaCta from "@/components/marketing/OpenQykaCta";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion";
import { QYKA_LOGO_CACHE_KEY, QYKA_LOGO_DATA_URI } from "@/components/marketing/logoData";
import { hashFromHref, scrollToSection } from "@/lib/scrollToSection";

function useHomeHashNav() {
  const router = useRouter();

  return (e: MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute("href") || "";
    const hash = hashFromHref(href);
    if (!hash) return;

    e.preventDefault();
    if (window.location.pathname === "/") {
      scrollToSection(hash);
      window.history.pushState(null, "", `/#${hash}`);
      return;
    }
    sessionStorage.setItem("qyka-scroll-to", hash);
    router.push(`/#${hash}`);
  };
}

export default function MarketingFooter() {
  const onHomeHash = useHomeHashNav();

  return (
    <footer className="w-full bg-canvas-deep text-ink">
      <Stagger
        className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 sm:py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-16 lg:px-8 lg:py-20"
        stagger={0.1}
      >
        <StaggerItem y={28} scale={0.98}>
          <Link href="/" className="inline-flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={QYKA_LOGO_CACHE_KEY}
              src={QYKA_LOGO_DATA_URI}
              alt="Qyka Groceries"
              width={140}
              height={102}
              className="h-14 w-auto object-contain"
            />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink/60">
            Real groceries — open-air markets and supermarkets alike — shopped by agents, paid by
            transfer, and ridden to your door.
          </p>
          <OpenQykaCta alwaysShowLabel className="mt-6 pr-4" />
        </StaggerItem>

        <StaggerItem y={28} scale={0.98}>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-brand-orange-dark">Explore</h3>
          <ul className="mt-5 space-y-3">
            {[
              { href: "/#help", label: "Help" },
              { href: "/#faq", label: "FAQ" },
              { href: "/#action", label: "Choose a market" },
              { href: "/#customers", label: "Waitlist" },
            ].map((l) => (
              <li key={l.label}>
                {l.href.startsWith("/#") ? (
                  <a
                    href={l.href}
                    onClick={onHomeHash}
                    className="text-sm font-semibold text-ink/65 transition hover:text-ink"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href} className="text-sm font-semibold text-ink/65 transition hover:text-ink">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </StaggerItem>

        <StaggerItem y={28} scale={0.98}>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-brand-orange-dark">Company</h3>
          <ul className="mt-5 space-y-3">
            {[
              { href: "/about", label: "About Us" },
              { href: "/trust-and-safety", label: "Trust & Safety" },
              { href: "mailto:partners@quika.ng?subject=Qyka%20deck%20request", label: "Partners" },
            ].map((l) => (
              <li key={l.label}>
                {l.href.startsWith("mailto:") ? (
                  <a href={l.href} className="text-sm font-semibold text-ink/65 transition hover:text-ink">
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href} className="text-sm font-semibold text-ink/65 transition hover:text-ink">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </StaggerItem>

        <StaggerItem y={28} scale={0.98}>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-brand-orange-dark">Get involved</h3>
          <ul className="mt-5 space-y-3">
            {[
              { href: "/#customers", label: "Join waitlist" },
              { href: "/for-agents", label: "Become an Agent" },
              { href: "/for-riders", label: "Become a Rider" },
              { href: "mailto:hello@quika.ng", label: "Contact" },
            ].map((l) => (
              <li key={l.label}>
                {l.href.startsWith("/#") ? (
                  <a
                    href={l.href}
                    onClick={onHomeHash}
                    className="text-sm font-semibold text-ink/65 transition hover:text-ink"
                  >
                    {l.label}
                  </a>
                ) : l.href.startsWith("mailto:") ? (
                  <a href={l.href} className="text-sm font-semibold text-ink/65 transition hover:text-ink">
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href} className="text-sm font-semibold text-ink/65 transition hover:text-ink">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </StaggerItem>
      </Stagger>

      <Reveal y={16}>
        <div className="border-t border-ink/10">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-5 text-xs text-ink/45 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} Qyka Groceries · Pre-pilot</p>
            <a href="mailto:hello@quika.ng" className="font-semibold text-ink/55 transition hover:text-ink">
              hello@quika.ng
            </a>
          </div>
        </div>
      </Reveal>
    </footer>
  );
}
