"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent } from "react";
import { BoltMark } from "@/components/marketing/BoltBasket";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion";
import { QUIKA_LOGO_CACHE_KEY, QUIKA_LOGO_DATA_URI } from "@/components/marketing/logoData";
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
    sessionStorage.setItem("quika-scroll-to", hash);
    router.push(`/#${hash}`);
  };
}

export default function MarketingFooter() {
  const onHomeHash = useHomeHashNav();

  return (
    <footer className="w-full bg-ink text-white">
      <Stagger
        className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 sm:py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-16 lg:px-8 lg:py-20"
        stagger={0.1}
      >
        <StaggerItem y={28} scale={0.98}>
          <Link href="/" className="inline-flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={QUIKA_LOGO_CACHE_KEY}
              src={QUIKA_LOGO_DATA_URI}
              alt="Quika Groceries"
              width={140}
              height={102}
              className="h-14 w-auto object-contain brightness-0 invert"
            />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
            Real market shopping for Nigerian open-air markets — agents, transfers, and delivery home.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-green py-1.5 pl-1.5 pr-4 text-white transition hover:bg-brand-green/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <BoltMark className="h-10 w-10" iconClassName="h-[48%] w-[48%]" />
            <span className="text-sm font-bold">Open Quika</span>
          </Link>
        </StaggerItem>

        <StaggerItem y={28} scale={0.98}>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-gold">Explore</h3>
          <ul className="mt-5 space-y-3">
            {[
              { href: "/#how", label: "How It Works" },
              { href: "/markets", label: "Markets" },
              { href: "/#customers", label: "Waitlist" },
            ].map((l) => (
              <li key={l.label}>
                {l.href.startsWith("/#") ? (
                  <a
                    href={l.href}
                    onClick={onHomeHash}
                    className="text-sm font-semibold text-white/65 transition hover:text-white"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href} className="text-sm font-semibold text-white/65 transition hover:text-white">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </StaggerItem>

        <StaggerItem y={28} scale={0.98}>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-gold">Company</h3>
          <ul className="mt-5 space-y-3">
            {[
              { href: "/about", label: "About Us" },
              { href: "/trust-and-safety", label: "Trust & Safety" },
              { href: "mailto:partners@quika.ng?subject=Quika%20deck%20request", label: "Partners" },
            ].map((l) => (
              <li key={l.label}>
                {l.href.startsWith("mailto:") ? (
                  <a href={l.href} className="text-sm font-semibold text-white/65 transition hover:text-white">
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href} className="text-sm font-semibold text-white/65 transition hover:text-white">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </StaggerItem>

        <StaggerItem y={28} scale={0.98}>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-gold">Get involved</h3>
          <ul className="mt-5 space-y-3">
            {[
              { href: "/#customers", label: "Join waitlist" },
              { href: "/for-agents", label: "For Agents" },
              { href: "mailto:hello@quika.ng", label: "Contact" },
            ].map((l) => (
              <li key={l.label}>
                {l.href.startsWith("/#") ? (
                  <a
                    href={l.href}
                    onClick={onHomeHash}
                    className="text-sm font-semibold text-white/65 transition hover:text-white"
                  >
                    {l.label}
                  </a>
                ) : l.href.startsWith("mailto:") ? (
                  <a href={l.href} className="text-sm font-semibold text-white/65 transition hover:text-white">
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href} className="text-sm font-semibold text-white/65 transition hover:text-white">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </StaggerItem>
      </Stagger>

      <Reveal y={16}>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-5 text-xs text-white/40 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} Quika Groceries · Pre-pilot</p>
            <a href="mailto:hello@quika.ng" className="font-semibold text-white/50 transition hover:text-white">
              hello@quika.ng
            </a>
          </div>
        </div>
      </Reveal>
    </footer>
  );
}
