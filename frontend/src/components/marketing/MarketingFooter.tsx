"use client";

import Link from "next/link";
import Image from "next/image";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/marketing/LanguageSwitcher";
import { useT } from "@/lib/locale";
import basket from "@/assets/illustrations/grocery-basket.png";
import squiggle from "@/assets/illustrations/decorative-squiggle-leaf.png";

const COLUMNS = [
  { key: "qyka", links: [["how", "/#how-it-works"], ["markets", "/markets"], ["pricing", "/pricing"], ["help", "/help"]] },
  { key: "earn", links: [["agent", "/for-agents"], ["rider", "/for-riders"]] },
  { key: "company", links: [["about", "/about"], ["trust", "/trust-and-safety"]] },
] as const;

export default function MarketingFooter() {
  const t = useT();
  return (
    <footer className="relative overflow-hidden border-t border-line bg-surface">
      <Image src={squiggle} alt="" aria-hidden className="pointer-events-none absolute -left-4 top-6 w-16 -rotate-12 opacity-[0.14]" />
      <Image src={basket} alt="" aria-hidden className="pointer-events-none absolute -bottom-4 right-6 hidden w-36 rotate-6 opacity-[0.16] md:block" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Brand size="lg" />
            <p className="mt-4 max-w-xs text-muted">
              {t.footer.tagline}
            </p>
            <Link
              href="/shop"
              className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-brand-orange px-5 font-display font-bold text-[#1A1A1A] transition hover:bg-brand-orange-dark"
            >
              {t.footer.start}
            </Link>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.key}>
              <h3 className="font-display text-sm font-bold text-ink">{t.footer.cols[c.key]}</h3>
              <ul className="mt-4 space-y-3">
                {c.links.map(([k, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-muted transition hover:text-brand-orange-dark">
                      {t.footer.links[k]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-dashed border-line pt-6 text-sm text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Qyka Technologies Ltd · Ibadan, Nigeria</p>
          <div className="flex flex-wrap items-center gap-5">
            <LanguageSwitcher />
            <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/legal/ndpr" className="hover:text-ink">NDPR</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
