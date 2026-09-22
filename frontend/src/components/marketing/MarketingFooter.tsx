"use client";

import Link from "next/link";
import Image from "next/image";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/marketing/LanguageSwitcher";
import { useT } from "@/lib/locale";
import footerStrip from "@/assets/illustrations/footer.webp";

const COLUMNS = [
  { key: "qyka", links: [["how", "/#how-it-works"], ["markets", "/markets"], ["pricing", "/pricing"], ["help", "/help"]] },
  { key: "earn", links: [["agent", "/for-agents"], ["rider", "/for-riders"]] },
  { key: "company", links: [["about", "/about"], ["trust", "/trust-and-safety"]] },
] as const;

export default function MarketingFooter() {
  const t = useT();
  return (
    <><div className="relative mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
          {/* The market street - same centered column every other element on
              the page lives in, not a raw edge-to-edge bleed (that's what
              was reading as a stray banner: it was the one thing on the
              whole page cutting stalls off at the exact screen edge with no
              frame). Natural aspect ratio, `h-auto` and no object-cover, so
              nothing gets cropped either - the old fixed-height box was
              clipping the tallest awnings' peaks. Sits right at the top of
              the footer, attached to it, not floating in a gap above it. */}
          <Image
            src={footerStrip}
            alt=""
            aria-hidden
            className="h-auto w-full select-none"
            priority={false}
          />
        </div>
      <footer className="relative bg-white text-black">
        
        {/* The ground line, right under the strip image - full viewport
            width (not just the max-w-6xl column the image itself sits in),
            since a border on the image would only span that column. */}
        <div className="-mt-px w-full border-b border-white/15" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
            <div>
              <Brand size="lg" />
              <p className="mt-4 max-w-xs text-black/60">
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
                <h3 className="font-display text-sm font-bold text-black">{t.footer.cols[c.key]}</h3>
                <ul className="mt-4 space-y-3">
                  {c.links.map(([k, href]) => (
                    <li key={href}>
                      <Link href={href} className="text-black/60 transition hover:text-brand-orange">
                        {t.footer.links[k]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-dashed border-white/15 pt-6 text-sm text-black/60 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Qyka Technologies Ltd · Ibadan, Nigeria</p>
            <div className="flex flex-wrap items-center gap-5">
              <LanguageSwitcher />
              <Link href="/legal/terms" className="hover:text-black">Terms</Link>
              <Link href="/legal/privacy" className="hover:text-black">Privacy</Link>
              <Link href="/legal/ndpr" className="hover:text-black">NDPR</Link>
            </div>
          </div>
        </div>
        {/* A big, quiet wordmark closing out the page - the last thing
            anyone sees before the footer ends. Deliberately faint (white at
            low opacity now the footer's black, not another peach) so it
            reads as a watermark, not a second heading competing with the
            real copy above it. */}
        <p
          aria-hidden
          className="select-none overflow-hidden whitespace-nowrap px-4 pb-2 text-center font-logo text-[18vw] leading-none text-black/[0.08] sm:px-6 sm:text-[10rem]"
        >
          Qyka Groceries
        </p>
      </footer>
    </>
  );
}
