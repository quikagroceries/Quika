"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { hashFromHref, scrollToSection } from "@/lib/scrollToSection";
import { FAQS, HELP_TOPICS } from "@/lib/helpContent";

/**
 * Persistent smart-help bubble — replaces the old "Help" nav item. Static
 * (no LLM backend): search filters the same FAQ content used on the
 * homepage, topic buttons jump to the relevant page/section, and there's
 * always a direct human fallback. Present on every marketing page (added
 * once per screen, not a shared layout — see screens/*.tsx).
 */
export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return FAQS.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)).slice(0, 4);
  }, [query]);

  useEffect(() => {
    if (!panelRef.current) return;
    if (open) {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: 16, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: "back.out(1.6)" }
      );
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    if (!panelRef.current) {
      setOpen(false);
      return;
    }
    gsap.to(panelRef.current, {
      opacity: 0,
      y: 12,
      scale: 0.96,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => setOpen(false),
    });
  }

  function goTopic(href: string) {
    const hash = hashFromHref(href);
    close();
    if (hash) {
      if (window.location.pathname === "/") {
        scrollToSection(hash);
        window.history.pushState(null, "", `/#${hash}`);
      } else {
        sessionStorage.setItem("qyka-scroll-to", hash);
        window.location.href = `/#${hash}`;
      }
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6">
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Qyka help"
          className="absolute bottom-16 right-0 w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl bg-white shadow-[0_24px_60px_rgba(33,26,20,0.28)] ring-1 ring-ink/10"
        >
          <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
            <div>
              <p className="font-display text-base font-bold text-ink">Qyka Help</p>
              <p className="text-xs text-ink/50">Search, or pick a topic below.</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close help"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink/50 transition hover:bg-sunken hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="px-5 pt-4">
            <div className="relative">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question…"
                className="h-11 w-full rounded-full border border-ink/10 bg-canvas pl-10 pr-4 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-brand-orange/40"
              />
            </div>
          </div>

          <div className="max-h-[22rem] overflow-y-auto px-5 py-4">
            {query.trim() ? (
              matches.length ? (
                <ul className="space-y-3">
                  {matches.map((m) => (
                    <li key={m.q} className="rounded-xl bg-canvas p-3.5">
                      <p className="text-sm font-bold text-ink">{m.q}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink/60">{m.a}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-2 text-center">
                  <p className="text-sm text-ink/50">No match yet — try a real person instead.</p>
                  <a
                    href="mailto:hello@quika.ng?subject=Qyka%20question"
                    className="mt-2 inline-flex text-sm font-bold text-brand-orange hover:underline"
                  >
                    Email hello@quika.ng →
                  </a>
                </div>
              )
            ) : (
              <>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/40">Browse a topic</p>
                <div className="grid grid-cols-2 gap-2">
                  {HELP_TOPICS.map((t) => {
                    const hash = hashFromHref(t.href);
                    const className =
                      "rounded-xl bg-canvas p-3 text-left text-xs font-bold text-ink transition hover:bg-sunken";
                    if (hash) {
                      return (
                        <button key={t.title} type="button" onClick={() => goTopic(t.href)} className={className}>
                          {t.title}
                        </button>
                      );
                    }
                    if (t.href.startsWith("mailto:")) {
                      return (
                        <a key={t.title} href={t.href} className={className}>
                          {t.title}
                        </a>
                      );
                    }
                    return (
                      <Link key={t.title} href={t.href} onClick={close} className={className}>
                        {t.title}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label={open ? "Close help" : "Open help"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-[0_12px_32px_rgba(33,26,20,0.35)] transition hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M8.5 15h7c2 0 3.5-1.5 3.5-3.5S17.5 8 15.5 8h-7C6.5 8 5 9.5 5 11.5S6.5 15 8.5 15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 15v2.5L12 15" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
            <circle cx="12" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
            <circle cx="15" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
          </svg>
        )}
      </button>
    </div>
  );
}
