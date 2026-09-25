"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import HelpWidget from "@/components/marketing/HelpWidget";
import squiggle1 from "@/assets/illustrations/decorative-squiggle-1.png";
import squiggle2 from "@/assets/illustrations/decorative-squiggle-2.png";

export type EarnConfig = {
  eyebrow: string;
  title: string;
  titleAccent: string; // the underlined part of the headline
  lede: string;
  cta: string;
  hero: { main: StaticImageData; alt: string; extras: { src: StaticImageData; cls: string }[] };
  perks: { title: string; body: string; art: StaticImageData }[];
  dayTitle: string;
  day: { title: string; body: string; art: StaticImageData }[];
  fit: { title: string; body: string }[];
  requirements: string[];
  faq: { q: string; a: string }[];
  // Submitted straight to the backend (POST /agent-applications/public) and
  // shown to admins under Agents / Riders - no account or email needed.
  // `type: "market"` renders the live market list; "tel" a phone keyboard.
  form: {
    kind: "agent" | "rider";
    heading: string;
    fields: { key: "full_name" | "phone" | "market_id" | "area" | "vehicle"; label: string; required?: boolean; type?: "text" | "tel" | "market" }[];
    art: StaticImageData;
  };
  estimator?: { perUnit: number; unit: string; min: number; max: number; start: number };
  other: { label: string; href: string; art: StaticImageData; blurb: string };
};

function Eyebrow({ children }: { children: string }) {
  return <p className="font-display text-sm font-bold uppercase tracking-[0.12em] text-brand-orange-dark">{children}</p>;
}
function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-tight tracking-tight text-ink">
      {children}
    </h2>
  );
}

function Estimator({ cfg }: { cfg: NonNullable<EarnConfig["estimator"]> }) {
  const [n, setN] = useState(cfg.start);
  return (
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h3 className="font-display text-xl font-extrabold text-ink">Estimate your earnings</h3>
      <label htmlFor="est" className="mt-4 block text-sm font-semibold text-ink">
        {cfg.unit} per week: <span className="tabular-nums">{n}</span>
      </label>
      <input
        id="est"
        type="range"
        min={cfg.min}
        max={cfg.max}
        value={n}
        onChange={(e) => setN(Number(e.target.value))}
        className="mt-2 w-full accent-brand-orange"
      />
      <div className="mt-5 border-t border-dashed border-line pt-5">
        <p className="text-sm text-muted">Estimated weekly earnings</p>
        <p className="font-display text-4xl font-extrabold text-brand-orange-dark tabular-nums">
          ₦{(n * cfg.perUnit).toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-faint">Illustrative only. Actual earnings depend on the runs you complete.</p>
      </div>
    </div>
  );
}

// "409: {"detail":"..."}" -> the backend's own sentence, when it has one.
function errorText(err: any) {
  const m = /^\d{3}: ([\s\S]*)$/.exec(err?.message || "");
  try {
    const detail = m && JSON.parse(m[1]).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return "Please check the details and try again.";
  } catch {}
  return "Couldn't send your application. Check your connection and try again.";
}

const inputClass =
  "min-h-[48px] w-full rounded-2xl border border-line-strong bg-canvas px-4 text-base text-ink placeholder:text-faint focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange";

function ApplyForm({ cfg }: { cfg: EarnConfig["form"] }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [markets, setMarkets] = useState<any[]>([]);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsMarkets = cfg.fields.some((f) => f.type === "market");

  useEffect(() => {
    if (!needsMarkets) return;
    api.getMarkets().then(setMarkets).catch(() => setMarkets([]));
  }, [needsMarkets]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const body: any = { kind: cfg.kind };
      for (const f of cfg.fields) {
        const v = (vals[f.key] || "").trim();
        if (v) body[f.key] = v;
      }
      await api.submitApplication(body);
      setSent(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p className="rounded-2xl bg-brand-green/10 px-4 py-3 text-sm font-semibold text-brand-green">
        Application received. We&apos;ll call you on the number you gave to take it from there.
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      {cfg.fields.map((f) => (
        <div key={f.key}>
          <label htmlFor={`f-${f.key}`} className="mb-1 block text-sm font-semibold text-ink">
            {f.label}
          </label>
          {f.type === "market" ? (
            <select
              id={`f-${f.key}`}
              required={f.required}
              value={vals[f.key] || ""}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              className={inputClass}
            >
              <option value="">{f.required ? "Choose a market" : "No particular market"}</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.city ? ` — ${m.city}` : ""}</option>
              ))}
            </select>
          ) : (
            <input
              id={`f-${f.key}`}
              type={f.type === "tel" ? "tel" : "text"}
              inputMode={f.type === "tel" ? "tel" : undefined}
              autoComplete={f.key === "full_name" ? "name" : f.type === "tel" ? "tel" : undefined}
              required={f.required}
              value={vals[f.key] || ""}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              className={inputClass}
            />
          )}
        </div>
      ))}
      {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-1 inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-brand-orange px-6 font-display text-lg font-bold text-[#1A1A1A] shadow-sm transition hover:bg-brand-orange-dark active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Sending…" : `${cfg.heading} →`}
      </button>
    </form>
  );
}

function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line rounded-3xl border border-line bg-surface px-5 shadow-sm sm:px-8">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="font-display text-lg font-bold text-ink">{it.q}</span>
              <span
                className={
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-ink transition-transform duration-300 " +
                  (isOpen ? "rotate-45 bg-brand-orange" : "")
                }
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </span>
            </button>
            {isOpen && <p className="max-w-2xl pb-5 leading-relaxed text-muted">{it.a}</p>}
          </div>
        );
      })}
    </div>
  );
}

export default function EarnPage({ cfg }: { cfg: EarnConfig }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <MarketingHeader />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-orange/15 blur-3xl" />
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-2 lg:gap-12 lg:pb-20 lg:pt-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/15 px-3 py-1 text-xs font-bold text-brand-orange-dark">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-orange" />
                {cfg.eyebrow}
              </span>
              <h1 className="mt-4 font-display text-[clamp(2.2rem,5vw,3.75rem)] font-extrabold leading-[1.04] tracking-tight">
                {cfg.title}{" "}
                <span className="underline decoration-brand-orange/60 decoration-[6px] underline-offset-[6px] sm:decoration-[8px]">
                  {cfg.titleAccent}
                </span>
              </h1>
              <p className="mt-4 max-w-lg text-lg text-muted">{cfg.lede}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#apply"
                  className="inline-flex min-h-[52px] items-center rounded-full bg-brand-orange px-7 font-display text-lg font-bold text-[#1A1A1A] shadow-sm transition hover:bg-brand-orange-dark active:scale-[0.98]"
                >
                  {cfg.cta}
                </a>
                <a
                  href="#day"
                  className="inline-flex min-h-[52px] items-center rounded-full border border-line-strong bg-surface px-6 font-display text-lg font-bold text-ink transition hover:bg-sunken"
                >
                  See how it works
                </a>
              </div>
            </div>
            <div className="relative mx-auto aspect-square w-full max-w-[32rem]">
              <div className="absolute inset-[6%] rotate-3 rounded-[3rem] bg-brand-orange/30" />
              <div className="absolute inset-[12%] -rotate-3 rounded-[3rem] bg-surface shadow-sm" />
              <Image src={squiggle1} alt="" aria-hidden className="absolute -left-2 top-[8%] w-14 -rotate-12 opacity-40" />
              <Image src={squiggle2} alt="" aria-hidden className="absolute -right-2 bottom-[30%] w-14 rotate-12 opacity-40" />
              <Image src={cfg.hero.main} alt={cfg.hero.alt} priority className="absolute left-1/2 top-1/2 w-[64%] -translate-x-1/2 -translate-y-1/2" />
              {cfg.hero.extras.map((x, i) => (
                <Image key={i} src={x.src} alt="" aria-hidden className={"absolute " + x.cls} />
              ))}
            </div>
          </div>
        </section>

        {/* PERKS */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3">
            {cfg.perks.map((p) => (
              <div key={p.title} className="flex items-start gap-4 rounded-3xl bg-canvas p-5 ring-1 ring-line">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface ring-1 ring-line">
                  <Image src={p.art} alt="" aria-hidden className="h-9 w-9 object-contain" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-ink">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* A DAY ON THE JOB */}
        <section id="day" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
          <Eyebrow>How it works</Eyebrow>
          <H2>{cfg.dayTitle}</H2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cfg.day.map((d, i) => (
              <div
                key={d.title}
                className={"flex flex-col overflow-hidden rounded-3xl border border-line p-6 shadow-sm " + (i % 2 ? "bg-[#FBE7D5]" : "bg-surface")}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange font-display text-lg font-extrabold text-[#1A1A1A]">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-display text-xl font-extrabold">{d.title}</h3>
                <p className="mt-2 text-sm text-muted">{d.body}</p>
                <Image src={d.art} alt="" aria-hidden className="mt-5 h-32 w-full object-contain" />
              </div>
            ))}
          </div>
        </section>

        {/* IS THIS YOU + ESTIMATOR */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
            <div>
              <Eyebrow>Is this you?</Eyebrow>
              <H2>Built for people who already know the way.</H2>
              <ul className="mt-8 space-y-4">
                {cfg.fit.map((f) => (
                  <li key={f.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[#1A1A1A]">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="font-display font-bold text-ink">{f.title}</h3>
                      <p className="text-muted">{f.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center">{cfg.estimator ? <div className="w-full"><Estimator cfg={cfg.estimator} /></div> : (
              <div className="w-full rounded-3xl border border-line bg-canvas p-6 sm:p-8">
                <h3 className="font-display text-xl font-extrabold text-ink">What you need</h3>
                <ul className="mt-4 space-y-3">
                  {cfg.requirements.map((r) => (
                    <li key={r} className="flex items-start gap-3 text-muted">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}</div>
          </div>
        </section>

        {/* REQUIREMENTS (when the estimator took the slot above) + FAQ */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <Eyebrow>{cfg.estimator ? "Before you apply" : "Common questions"}</Eyebrow>
            <H2>{cfg.estimator ? "What you need." : "Before you ask."}</H2>
            {cfg.estimator && (
              <ul className="mt-6 space-y-3">
                {cfg.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-muted">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            {cfg.estimator && <p className="mb-3 font-display text-lg font-extrabold">Before you ask</p>}
            <Faq items={cfg.faq} />
          </div>
        </section>

        {/* APPLY */}
        <section id="apply" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="relative overflow-hidden rounded-[2rem] bg-brand-orange p-6 sm:p-10 lg:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-tight tracking-tight text-[#1A1A1A]">
                  Ready? Tell us about you.
                </h2>
                <p className="mt-3 max-w-md text-[#1A1A1A]/80">
                  Send your details and our team will reach out to verify you and get you started.
                </p>
                <div className="mt-6 hidden rounded-3xl bg-surface p-3 lg:block">
                  <Image src={cfg.form.art} alt="" aria-hidden className="h-44 w-full object-contain" />
                </div>
              </div>
              <div className="rounded-3xl bg-surface p-5 shadow-lg sm:p-7">
                <ApplyForm cfg={cfg.form} />
              </div>
            </div>
          </div>
        </section>

        {/* CROSS-LINK */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
          <Link
            href={cfg.other.href}
            className="group flex items-center gap-5 rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
          >
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-canvas ring-1 ring-line">
              <Image src={cfg.other.art} alt="" aria-hidden className="h-14 w-14 object-contain" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-extrabold text-ink">{cfg.other.label}</p>
              <p className="text-muted">{cfg.other.blurb}</p>
            </div>
            <span className="font-display text-2xl font-bold text-brand-orange-dark transition group-hover:translate-x-1">→</span>
          </Link>
        </section>
      </main>
      <MarketingFooter />
      <HelpWidget />
    </div>
  );
}
