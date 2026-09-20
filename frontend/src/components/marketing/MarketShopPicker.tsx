"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  DIRECTORY_MARKETS,
  filterDirectoryMarkets,
  type DirectoryMarket,
} from "@/lib/marketDirectory";

function sortMarkets(list: DirectoryMarket[]) {
  return [...list].sort((a, b) => {
    if (a.status === b.status) return a.name.localeCompare(b.name);
    return a.status === "pilot" ? -1 : 1;
  });
}

/** Market-first entry — live markets go straight to list-building; coming-soon stays inline. */
export default function MarketShopPicker({
  inputId,
  className = "",
  tone = "light",
  autoFocus = false,
}: {
  inputId?: string;
  className?: string;
  tone?: "light" | "inverse";
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const reactId = useId();
  const fieldId = inputId || `market-shop-${reactId}`;
  const listId = `${fieldId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [notifyMarket, setNotifyMarket] = useState<DirectoryMarket | null>(null);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySent, setNotifySent] = useState(false);

  const results = useMemo(() => sortMarkets(filterDirectoryMarkets(query)), [query]);
  const defaultList = useMemo(() => sortMarkets(DIRECTORY_MARKETS), []);
  const options = query.trim() ? results : defaultList;

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  function selectMarket(market: DirectoryMarket) {
    setQuery(market.name);
    setOpen(false);
    if (market.status === "pilot") {
      setNotifyMarket(null);
      setNotifySent(false);
      // Skip in-app picker — land on list-building for this market
      router.push(`/shop?market=${encodeURIComponent(market.id)}`);
      return;
    }
    setNotifyMarket(market);
    setNotifySent(false);
    setNotifyEmail("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const exact = options.find((m) => m.name.toLowerCase() === query.trim().toLowerCase());
    if (exact) {
      selectMarket(exact);
      return;
    }
    if (options[activeIndex]) {
      selectMarket(options[activeIndex]);
      return;
    }
    if (options[0]) selectMarket(options[0]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter" && open && options[activeIndex]) {
      e.preventDefault();
      selectMarket(options[activeIndex]);
    }
  }

  function submitNotify(e: FormEvent) {
    e.preventDefault();
    if (!notifyMarket || !notifyEmail.trim()) return;
    const subject = encodeURIComponent(`Notify me — ${notifyMarket.name}`);
    const body = encodeURIComponent(
      `Please notify me when Qyka opens at ${notifyMarket.name} (${notifyMarket.city}).\n\nEmail: ${notifyEmail.trim()}\n`
    );
    window.location.href = `mailto:hello@quika.ng?subject=${subject}&body=${body}`;
    setNotifySent(true);
  }

  const inverse = tone === "inverse";

  return (
    <div ref={rootRef} className={"relative w-full max-w-xl " + className}>
      <p
        className={
          "mb-2 text-left text-sm font-semibold " + (inverse ? "text-white/85" : "text-ink/70")
        }
      >
        Which market do you shop from?
      </p>

      <form
        onSubmit={onSubmit}
        className={
          "relative flex overflow-hidden rounded-full shadow-[0_10px_30px_rgba(33,26,20,0.08)] ring-1 " +
          (inverse ? "bg-white/95 ring-white/40" : "bg-white ring-ink/5")
        }
      >
        <label className="sr-only" htmlFor={fieldId}>
          Which market do you shop from?
        </label>
        <span
          className={"flex items-center pl-4 " + (inverse ? "text-brand-orange" : "text-ink/35")}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 9.5 12 4l8 5.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1V9.5Z" strokeLinejoin="round" />
          </svg>
        </span>
        <input
          id={fieldId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[activeIndex] ? `${listId}-${options[activeIndex].id}` : undefined}
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setNotifyMarket(null);
            setNotifySent(false);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search Balogun, Mile 12, Bodija…"
          className="min-h-[52px] flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-ink/40"
          autoComplete="off"
        />
        <button
          type="submit"
          className="m-1.5 inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-brand-orange px-4 text-sm font-bold text-[#1A1A1A] transition hover:bg-brand-orange-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:px-5"
        >
          Continue
        </button>
      </form>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className={
            "absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-auto rounded-2xl py-2 shadow-[0_16px_40px_rgba(33,26,20,0.14)] ring-1 " +
            (inverse ? "bg-white ring-ink/10" : "bg-white ring-ink/8")
          }
        >
          {options.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink/50">No markets match that name yet.</li>
          ) : (
            options.map((m, i) => {
              const active = i === activeIndex;
              return (
                <li key={m.id} role="option" id={`${listId}-${m.id}`} aria-selected={active}>
                  <button
                    type="button"
                    className={
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition " +
                      (active ? "bg-canvas" : "hover:bg-canvas/80")
                    }
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => selectMarket(m)}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-canvas ring-1 ring-ink/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.image} alt="" className="h-full w-full object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-ink">{m.name}</span>
                        <span
                          className={
                            "rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide " +
                            (m.status === "pilot"
                              ? "bg-brand-green/10 text-brand-green"
                              : "bg-ink/5 text-ink/50")
                          }
                        >
                          {m.status === "pilot" ? "Live" : "Coming soon"}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-ink/50">
                        {m.city}, {m.state}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}

      {notifyMarket && !open && (
        <div
          className={
            "mt-3 rounded-2xl p-4 text-left " +
            (inverse ? "bg-white/15 text-white ring-1 ring-white/25" : "bg-white text-ink shadow-[0_10px_30px_rgba(33,26,20,0.08)] ring-1 ring-ink/5")
          }
        >
          {notifySent ? (
            <p className={"text-sm font-semibold " + (inverse ? "text-white" : "text-brand-green")}>
              Opening your mail app — we&apos;ll note you for {notifyMarket.name}.
            </p>
          ) : (
            <>
              <p className={"text-sm font-bold " + (inverse ? "text-white" : "text-ink")}>
                {notifyMarket.name} isn&apos;t live yet
              </p>
              <p className={"mt-1 text-sm " + (inverse ? "text-white/75" : "text-ink/55")}>
                Leave your email and we&apos;ll tell you the moment shopping opens there — no app hop.
              </p>
              <form onSubmit={submitNotify} className="mt-3 flex gap-2">
                <input
                  type="email"
                  required
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="you@email.com"
                  className={
                    "min-h-11 flex-1 rounded-full px-4 text-sm text-ink outline-none ring-1 " +
                    (inverse ? "bg-white ring-transparent" : "bg-canvas ring-ink/10")
                  }
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-brand-orange px-4 text-sm font-bold text-[#1A1A1A] transition hover:bg-brand-orange-dark"
                >
                  Notify me
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
