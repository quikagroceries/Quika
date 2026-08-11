"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import { filterDirectoryMarkets } from "@/lib/marketDirectory";

export default function MarketsDirectory() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const markets = useMemo(() => filterDirectoryMarkets(query), [query]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = query.trim();
    const url = next ? `/markets?q=${encodeURIComponent(next)}` : "/markets";
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <MarketingHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">Directory</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Markets
          </h1>
          <p className="mt-3 text-base text-ink/60 sm:text-lg">
            Browse the markets Quika is building toward. Pilot access opens first — join the waitlist
            from the homepage when you&apos;re ready.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 flex max-w-xl overflow-hidden rounded-full bg-white shadow-[0_10px_30px_rgba(33,26,20,0.08)] ring-1 ring-ink/5">
          <label className="sr-only" htmlFor="markets-q">
            Search markets
          </label>
          <input
            id="markets-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by market, city, or area…"
            className="min-h-[52px] flex-1 bg-transparent px-5 text-sm text-ink outline-none placeholder:text-ink/40"
          />
          <button
            type="submit"
            className="m-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange text-white transition hover:bg-brand-orange-dark"
            aria-label="Search"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </button>
        </form>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {markets.map((m) => (
            <article
              key={m.id}
              className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_12px_32px_rgba(33,26,20,0.08)] ring-1 ring-ink/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.image} alt="" className="h-44 w-full object-cover" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-ink">{m.name}</h2>
                    <p className="mt-0.5 text-sm text-ink/50">
                      {m.city}, {m.state}
                    </p>
                  </div>
                  <span
                    className={
                      "shrink-0 rounded-full px-3 py-1 text-xs font-bold " +
                      (m.status === "pilot"
                        ? "bg-brand-green/10 text-brand-green"
                        : "bg-ink/5 text-ink/55")
                    }
                  >
                    {m.status === "pilot" ? "Pilot" : "Coming soon"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink/65">{m.blurb}</p>
                <Link
                  href="/#customers"
                  className="mt-4 inline-flex text-sm font-bold text-brand-orange hover:underline"
                >
                  Join waitlist →
                </Link>
              </div>
            </article>
          ))}
        </div>

        {markets.length === 0 && (
          <p className="mt-12 text-center text-ink/50">
            No markets match &ldquo;{query.trim()}&rdquo;.{" "}
            <button type="button" onClick={() => setQuery("")} className="font-semibold text-brand-orange hover:underline">
              Clear search
            </button>
          </p>
        )}
      </main>
    </div>
  );
}
