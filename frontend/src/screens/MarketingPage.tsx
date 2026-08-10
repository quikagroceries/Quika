"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BoltMark } from "@/components/marketing/BoltBasket";
import { QUIKA_LOGO_CACHE_KEY, QUIKA_LOGO_DATA_URI } from "@/components/marketing/logoData";

const PILOT = "our first pilot market";

const NAV_ITEMS = [
  { id: "action", label: "Product" },
  { id: "categories", label: "Categories" },
  { id: "trust", label: "Trust" },
  { id: "how", label: "How it works" },
  { id: "doors", label: "Join" },
];

function NavLink({ href, label, active, onClick }: any) {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={
        "relative pb-2 text-sm font-semibold transition-colors " +
        (active ? "text-ink" : "text-ink/55 hover:text-ink")
      }
    >
      {label}
      {/* Short centered orange bar — Meal Monkey “Foods” active style */}
      <span
        aria-hidden
        className={
          "absolute bottom-0 left-1/2 h-[3px] w-[1.1rem] -translate-x-1/2 rounded-full bg-brand-orange transition-opacity " +
          (active ? "opacity-100" : "opacity-0")
        }
      />
    </a>
  );
}

function Wave({ fill = "#211A14", flip = false }: any) {
  return (
    <div className={"wave-divider " + (flip ? "rotate-180" : "")} aria-hidden>
      <svg viewBox="0 0 1200 48" preserveAspectRatio="none">
        <path
          fill={fill}
          d="M0 24 Q50 0 100 24 T200 24 T300 24 T400 24 T500 24 T600 24 T700 24 T800 24 T900 24 T1000 24 T1100 24 T1200 24 V48 H0Z"
        />
      </svg>
    </div>
  );
}

function FeatureRow({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-[0_10px_28px_rgba(33,26,20,0.12)]">
        {icon}
      </span>
      <div className="pt-0.5">
        <p className="font-display text-lg font-bold tracking-tight text-ink">{title}</p>
        <p className="mt-0.5 text-sm leading-snug text-ink/55">{body}</p>
      </div>
    </div>
  );
}

function HeroPortrait() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      {/* Soft ground shadow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[18%] rounded-full bg-ink/10 blur-2xl"
      />

      {/* Gold disc — Meal Monkey yellow circle */}
      <div className="absolute inset-[16%] rounded-full bg-gold" />

      {/* Dashed ring just inside the gold edge */}
      <div
        aria-hidden
        className="absolute inset-[18.5%] rounded-full border-[1.5px] border-dashed border-ink/25"
      />

      {/* Portrait */}
      <div className="absolute inset-[20%] overflow-hidden rounded-full bg-gold">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/quika-hero-person.jpg"
          alt="Shopper with a market basket"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Outer arcs — clear gap from the gold disc, slow spin */}
      <motion.svg
        viewBox="0 0 200 200"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={
          reduceMotion ? undefined : { duration: 28, ease: "linear", repeat: Infinity }
        }
      >
        {/* Green — top-left */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="#0E7A3C"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="48 530"
          transform="rotate(-40 100 100)"
        />
        {/* Grey — top-right */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="#C9C2B6"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="40 538"
          transform="rotate(28 100 100)"
        />
        {/* Orange — bottom */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="#E8541E"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="56 522"
          transform="rotate(145 100 100)"
        />
      </motion.svg>
    </div>
  );
}

function WaitlistInline() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    const subject = encodeURIComponent(`Quika waitlist — ${PILOT}`);
    const body = encodeURIComponent(`Join waitlist for ${PILOT}.\n\nEmail: ${email.trim()}\n`);
    window.location.href = `mailto:hello@quika.ng?subject=${subject}&body=${body}`;
    setSent(true);
  }

  if (sent) {
    return <p className="text-sm font-semibold text-brand-green">Opening your mail app…</p>;
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md overflow-hidden rounded-full bg-white shadow-[0_10px_30px_rgba(33,26,20,0.1)] ring-1 ring-ink/5">
      <label className="sr-only" htmlFor="find-market">Email for waitlist</label>
      <input
        id="find-market"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Join waitlist with email…"
        className="min-h-[52px] flex-1 bg-transparent px-5 text-sm text-ink outline-none placeholder:text-ink/40"
      />
      <button
        type="submit"
        className="m-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green text-white transition hover:bg-brand-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        aria-label="Join waitlist"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}

/** Meal Monkey–style hero CTAs: green primary + play “How to order” */
function HeroCtas() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-wrap items-center gap-5 sm:gap-7">
      <a
        href="#customers"
        className="inline-flex min-h-[48px] items-center gap-3 rounded-full bg-brand-green py-2.5 pl-4 pr-6 text-white shadow-[0_10px_24px_rgba(14,122,60,0.28)] transition hover:bg-brand-green/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <span aria-hidden className="h-5 w-px shrink-0 bg-white/35" />
        <span className="text-sm font-semibold tracking-tight">Start shopping</span>
      </a>

      <a
        href="#how"
        className="group inline-flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <span className="relative flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center">
          <motion.svg
            viewBox="0 0 52 52"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 14, ease: "linear", repeat: Infinity }
            }
          >
            <circle
              cx="26"
              cy="26"
              r="22"
              fill="none"
              stroke="#E8541E"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="92 140"
              transform="rotate(118 26 26)"
            />
          </motion.svg>
          <span className="relative z-[1] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_rgba(33,26,20,0.14)] transition group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5 text-ink" fill="currentColor" aria-hidden>
              <path d="M8 5.5v13l11-6.5L8 5.5Z" />
            </svg>
          </span>
        </span>
        <span className="text-sm font-semibold text-ink">How to order</span>
      </a>
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.min(1, Math.max(0, rating - i));
        return (
          <span key={i} className="relative inline-block h-3.5 w-3.5">
            <svg viewBox="0 0 20 20" className="absolute inset-0 h-full w-full text-[#E5E0D6]" aria-hidden>
              <path
                fill="currentColor"
                d="M10 1.5 12.6 7l6 .5-4.6 4 1.4 5.8L10 14.5 4.6 17.3 6 11.5 1.4 7.5l6-.5L10 1.5Z"
              />
            </svg>
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-gold" aria-hidden>
                <path
                  fill="currentColor"
                  d="M10 1.5 12.6 7l6 .5-4.6 4 1.4 5.8L10 14.5 4.6 17.3 6 11.5 1.4 7.5l6-.5L10 1.5Z"
                />
              </svg>
            </span>
          </span>
        );
      })}
    </div>
  );
}

function StoreRatingCard({
  store,
  rating,
}: {
  store: "google" | "apple";
  rating: string;
}) {
  return (
    <div className="flex w-[7.25rem] flex-col items-center bg-white px-3 pb-4 pt-5 shadow-[0_12px_28px_rgba(33,26,20,0.14)] sm:w-[8rem]" style={{ borderRadius: "999px 999px 14px 14px" }}>
      {store === "google" ? (
        <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
          <path fill="#4285F4" d="M3.5 2.8 13.2 12 3.5 21.2V2.8Z" />
          <path fill="#34A853" d="M3.5 21.2 13.2 12l3.4 3.2L6.2 22.4c-.9.5-2.1-.1-2.1-1.2v0Z" />
          <path fill="#FBBC04" d="M20.2 10.7c.9.5.9 1.7 0 2.2l-3.6 2.1L13.2 12l3.4-3.4 3.6 2.1Z" />
          <path fill="#EA4335" d="M3.5 2.8C3.5 1.7 4.7 1.1 5.6 1.6l10.4 6.1L13.2 12 3.5 2.8Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
          {/* Stylized App Store “A” mark */}
          <path fill="#1C7CF2" d="M12 2.2 3.8 20.5h3.2l1.6-3.6h7l1.6 3.6h3.2L12 2.2Zm0 5.2 2.6 6.1H9.4L12 7.4Z" />
        </svg>
      )}
      <div className="mt-2">
        <StarRow rating={parseFloat(rating)} />
      </div>
      <p className="mt-2 font-sans text-base font-extrabold tracking-tight text-ink">{rating}/5</p>
    </div>
  );
}

/** Uses `/quika-app-phone.png` when present; otherwise a phone-shaped placeholder. */
function AppPhoneSlot() {
  const [hasPhoneArt, setHasPhoneArt] = useState(true);

  return (
    <div className="relative mx-auto w-[200px] sm:w-[220px] lg:w-[240px]">
      {/* Motion dashes above the phone */}
      <svg
        viewBox="0 0 40 28"
        className="absolute -top-3 right-6 z-[2] h-7 w-9 text-ink"
        aria-hidden
      >
        <path d="M8 20c4-6 6-10 6-14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M18 18c3-5 5-9 5-13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M28 16c2-4 3-7 3-11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {hasPhoneArt ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/quika-app-phone.png"
          alt="Quika mobile app"
          className="relative z-[1] w-full drop-shadow-[0_24px_40px_rgba(33,26,20,0.28)]"
          onError={() => setHasPhoneArt(false)}
        />
      ) : (
        <div
          className="relative aspect-[9/19] w-full rounded-[2rem] border-[6px] border-ink bg-white shadow-[0_24px_40px_rgba(33,26,20,0.28)]"
          aria-hidden
        >
          <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-ink/15" />
          <div className="flex h-[calc(100%-0.75rem)] flex-col items-center justify-center gap-2 px-4 text-center">
            <BoltMark className="h-12 w-12" />
            <p className="font-display text-sm font-bold text-ink">Phone mockup</p>
            <p className="text-[11px] text-ink/45">Add /quika-app-phone.png</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PromoSoda() {
  return (
    <svg viewBox="0 0 80 100" className="h-20 w-16 drop-shadow-[0_10px_18px_rgba(33,26,20,0.22)] sm:h-24 sm:w-20" aria-hidden>
      <path d="M48 8c0 8-6 12-10 18" fill="none" stroke="#7C3AED" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="34" cy="28" rx="18" ry="6" fill="#F4F0E6" />
      <path d="M18 30h32l-4 58H22L18 30Z" fill="#F4F0E6" />
      <path d="M22 38h24l-1.2 16H23.2L22 38Z" fill="#E8541E" />
      <path d="M23.5 60h21l-1.2 16H24.7L23.5 60Z" fill="#E8541E" />
      <ellipse cx="34" cy="88" rx="14" ry="4" fill="#E4D8C6" />
    </svg>
  );
}

function PromoPizza() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28 drop-shadow-[0_14px_24px_rgba(33,26,20,0.25)] sm:h-36 sm:w-36" aria-hidden>
      <ellipse cx="58" cy="64" rx="46" ry="46" fill="#E8A317" />
      <ellipse cx="58" cy="64" rx="38" ry="38" fill="#F2C14E" />
      <circle cx="42" cy="52" r="5" fill="#C2430F" />
      <circle cx="68" cy="48" r="4.5" fill="#C2430F" />
      <circle cx="54" cy="72" r="5" fill="#C2430F" />
      <circle cx="74" cy="70" r="4" fill="#0E7A3C" />
      <circle cx="46" cy="66" r="3.5" fill="#0E7A3C" />
      {/* Separated slice */}
      <path d="M96 28 118 18l4 24-22 4-4-22Z" fill="#E8A317" />
      <path d="M99 30 116 22l2.5 16-17 3-1.5-11Z" fill="#F2C14E" />
      <circle cx="108" cy="30" r="2.5" fill="#C2430F" />
    </svg>
  );
}

function AgentFormCompact() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    const subject = encodeURIComponent("Quika agent application");
    const body = encodeURIComponent(`Name: ${name}\nPhone: ${phone}\n`);
    window.location.href = `mailto:agents@quika.ng?subject=${subject}&body=${body}`;
    setSent(true);
  }

  if (sent) return <p className="text-sm font-semibold text-brand-green">Opening your mail app…</p>;

  return (
    <form onSubmit={submit} className="mt-4 space-y-2">
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="min-h-[40px] w-full rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/50 outline-none focus:border-gold" />
      <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="min-h-[40px] w-full rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/50 outline-none focus:border-gold" />
      <button type="submit" className="min-h-[40px] w-full rounded-lg bg-gold font-display text-sm font-bold text-ink hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
        Apply →
      </button>
    </form>
  );
}

export default function MarketingPage() {
  const [activeId, setActiveId] = useState("action");

  useEffect(() => {
    const ids = NAV_ITEMS.map((i) => i.id);
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (elements.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.25, 0.5] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-canvas text-ink">
      {/* NAV — Meal Monkey style */}
      <header className="sticky top-0 z-40 mx-auto max-w-6xl rounded-b-3xl bg-white shadow-sm">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="relative z-[1] flex shrink-0 items-center gap-2">
            {/* Inlined data URI — cannot be served from a stale static-file cache. */}
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
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 md:flex"
            aria-label="Primary"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.id}
                href={`#${item.id}`}
                label={item.label}
                active={activeId === item.id}
                onClick={() => setActiveId(item.id)}
              />
            ))}
          </nav>
          <Link
            href="/login"
            className="relative z-[1] flex items-center gap-2 rounded-full bg-brand-green py-1 pl-1 pr-3 text-white transition hover:bg-brand-green/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <BoltMark className="h-9 w-9" iconClassName="h-[48%] w-[48%]" />
            <span className="hidden text-sm font-bold sm:inline">Open Quika</span>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-brand-orange/10 blur-3xl" />

        {/* Bottom-right Meal Monkey–style disc stack */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 sm:-bottom-32 sm:-right-28 sm:h-96 sm:w-96 lg:-bottom-40 lg:-right-36 lg:h-[28rem] lg:w-[28rem]"
        >
          <div className="absolute inset-0 rounded-full bg-gold" />
          <div className="absolute left-[-6%] top-[30%] h-[34%] w-[34%] rounded-full bg-brand-green" />
        </div>

        <div className="relative z-[1] mx-auto grid max-w-6xl items-center gap-12 px-4 pb-14 pt-28 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-10 lg:pb-20 lg:pt-36">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative">
              {/* Soft orange disc behind the headline — Meal Monkey hero accent */}
              <div
                aria-hidden
                className="pointer-events-none absolute -left-12 -top-10 h-32 w-32 rounded-full sm:-left-16 sm:-top-14 sm:h-40 sm:w-40"
                style={{ backgroundColor: "rgba(232, 84, 30, 0.05)" }}
              />
              <h1 className="relative z-[1] font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]">
                Real{" "}
                <span className="text-brand-orange">Market</span>{" "}
                <span className="text-brand-green">Shopping</span>,
                <br />
                <span className="text-brand-orange">Made</span>{" "}
                <span className="text-brand-green">Easy</span>.
              </h1>
            </div>
            <motion.div
              className="mt-7 flex max-w-md items-center gap-4 sm:gap-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white shadow-[0_0_0_1px_rgba(33,26,20,0.06),0_8px_20px_rgba(33,26,20,0.1)] sm:h-14 sm:w-14">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/quika-hero-person.jpg"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-[0.95rem] font-medium leading-snug text-ink sm:text-lg">
                When you can&apos;t make it to the market,
                <br />
                we&apos;re just a click away.
              </p>
            </motion.div>
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <HeroCtas />
            </motion.div>
            <p className="mt-3 text-xs font-medium text-ink/40">
              Pre-pilot · Join the waitlist to start your first list
            </p>
          </motion.div>

          <motion.div
            className="mx-auto flex w-full max-w-lg flex-col items-center gap-10 sm:max-w-none sm:flex-row sm:items-center sm:gap-8 lg:max-w-none"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="w-full max-w-[280px] shrink-0 sm:max-w-[260px] lg:max-w-[300px]">
              <HeroPortrait />
            </div>

            <div className="flex w-full max-w-xs flex-col gap-7 sm:max-w-none">
              <FeatureRow
                title="Free-text lists"
                body="Write ₦500 of pepper — no catalogue needed."
                icon={
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 6h12M8 12h12M8 18h8" strokeLinecap="round" />
                    <path d="M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" />
                  </svg>
                }
              />
              <FeatureRow
                title="Transfer pay"
                body="Agent bargains, then pays stalls by transfer."
                icon={
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17 17 7M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />
              <FeatureRow
                title="Courier delivery"
                body="Packed at the market and brought to your door."
                icon={
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7V10z" strokeLinejoin="round" />
                    <circle cx="7" cy="18" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="17" cy="18" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                }
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ORANGE APP BANNER — Meal Monkey download strip */}
      <section id="action" className="relative z-[1] px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-10">
        <div className="relative mx-auto max-w-6xl">
          <div className="relative rounded-[2.5rem] bg-brand-orange px-5 py-10 shadow-[0_18px_50px_rgba(232,84,30,0.28)] sm:rounded-[3rem] sm:px-10 sm:py-12 lg:min-h-[220px] lg:px-12 lg:py-14">
            {/* Floating soda */}
            <motion.div
              className="pointer-events-none absolute left-[42%] top-0 z-[2] -translate-x-1/2 -translate-y-1/3 sm:left-[46%]"
              animate={{ y: [0, -6, 0], rotate: [-8, -4, -8] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <PromoSoda />
            </motion.div>

            {/* Floating pizza */}
            <motion.div
              className="pointer-events-none absolute -right-4 -top-10 z-[2] sm:-right-2 sm:-top-14 lg:-right-6"
              animate={{ y: [0, -8, 0], rotate: [6, 10, 6] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            >
              <PromoPizza />
            </motion.div>

            <div className="grid items-center gap-8 lg:grid-cols-[220px_1fr_auto] lg:gap-6">
              {/* Phone — overhangs the orange card */}
              <div className="relative z-[3] mx-auto w-fit lg:-my-20 lg:mx-0 lg:-ml-4">
                <AppPhoneSlot />
              </div>

              {/* Headline + avatars + arrow */}
              <div className="relative z-[1] text-center lg:px-4 lg:text-left">
                <h2 className="font-display text-[1.85rem] font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[2.6rem]">
                  Download our
                  <br />
                  Mobile App
                </h2>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  <div className="flex items-center -space-x-3">
                    {[
                      "/quika-hero-person.jpg",
                      "/quika-cat-produce.jpg",
                      "/quika-cat-protein.jpg",
                      "/quika-trust-basket.jpg",
                    ].map((src) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src}
                        src={src}
                        alt=""
                        className="h-11 w-11 rounded-full border-[2.5px] border-white object-cover shadow-sm"
                      />
                    ))}
                  </div>
                  <Link
                    href="/login"
                    aria-label="Open Quika app"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-[0_8px_20px_rgba(33,26,20,0.16)] transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                      <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Store rating cards */}
              <div className="relative z-[1] flex items-end justify-center gap-3 sm:gap-4 lg:justify-end lg:pb-1">
                <StoreRatingCard store="google" rating="4.5" />
                <StoreRatingCard store="apple" rating="4.8" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES — 3 circular cards */}
      <section id="categories" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Our <span className="text-brand-orange">best shopped</span> categories.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-ink/55">
            Real market baskets — not supermarket aisles. Tap one to start your waitlist list.
          </p>

          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {[
              { img: "/quika-cat-produce.jpg", title: "Fresh produce", ring: "text-brand-green", bg: "bg-brand-green/15" },
              { img: "/quika-cat-protein.jpg", title: "Proteins & fish", ring: "text-brand-orange", bg: "bg-brand-orange/15" },
              { img: "/quika-cat-pantry.jpg", title: "Pantry & provisions", ring: "text-gold", bg: "bg-gold/20" },
            ].map((c) => (
              <a key={c.title} href="#customers" className="group flex flex-col items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
                <div className={"relative flex h-52 w-52 items-center justify-center rounded-full sm:h-56 sm:w-56 " + c.bg}>
                  <div className={"absolute inset-3 rounded-full dashed-ring " + c.ring} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.img} alt="" className="relative z-[1] h-40 w-40 rounded-full object-cover shadow-lg transition duration-300 group-hover:scale-105 sm:h-44 sm:w-44" />
                </div>
                <h3 className="mt-6 font-display text-xl font-bold text-ink">{c.title}</h3>
                <span className="mt-2 text-sm font-bold text-brand-orange group-hover:underline">
                  Start a list &gt;
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* DARK TRUST SECTION with torn edge */}
      <div className="relative mt-6">
        <Wave fill="#211A14" />
        <section id="trust" className="bg-ink text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr_0.9fr] lg:py-20">
            <div>
              <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                Trust that fits{" "}
                <span className="text-brand-orange">real markets</span>
              </h2>
              <p className="mt-4 text-white/65">
                Quika&apos;s differentiator isn&apos;t speed slogans — it&apos;s how money moves when there&apos;s no catalogue.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/quika-trust-basket.jpg"
                alt="Market basket of groceries"
                className="w-full rounded-[2rem] object-cover shadow-2xl"
              />
            </div>

            <div className="space-y-6">
              {[
                { t: "Agent holds no cash", d: "Vendors paid by transfer only." },
                { t: "Transfer as receipt", d: "Every pay is photographed and logged." },
                { t: "Capped spending", d: "Hard ceilings — overages need your OK." },
                { t: "Deposit protection", d: "Commit before an agent is assigned." },
              ].map((f) => (
                <div key={f.t} className="flex gap-3">
                  <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange">
                    <BoltMark className="h-5 w-5 !bg-transparent" />
                  </span>
                  <div>
                    <p className="font-display font-bold">{f.t}</p>
                    <p className="text-sm text-white/55">{f.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <Wave fill="#211A14" flip />
      </div>

      {/* HOW WE SERVE — 3 circles (condensed from 6 steps into 3 visual beats + full 6 below) */}
      <section id="how" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            How we <span className="text-brand-orange">serve</span> you.
          </h2>

          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {[
              { n: "01–02", title: "Order & assign", body: "Send a free-text list. Accept a proposed agent from that market.", color: "#E8541E" },
              { n: "03–04", title: "Pay & shop", body: "Deposit or balance first. Agent bargains and transfers to vendors.", color: "#0E7A3C" },
              { n: "05–06", title: "Pack & deliver", body: "Photos, packing, courier — confirm when it reaches your door.", color: "#F2B705" },
            ].map((s) => (
              <div key={s.title} className="flex flex-col items-center text-center">
                <div className="relative flex h-40 w-40 items-center justify-center">
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
                    <circle cx="50" cy="50" r="46" fill="none" stroke="#efe6d9" strokeWidth="4" />
                    <circle cx="50" cy="50" r="46" fill="none" stroke={s.color} strokeWidth="4" strokeDasharray="90 200" strokeLinecap="round" />
                  </svg>
                  <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-[0_12px_40px_rgba(33,26,20,0.1)]">
                    <BoltMark className="h-8 w-8" />
                    <span className="mt-1 font-display text-xs font-bold text-ink/50">{s.n}</span>
                  </div>
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{s.title}</h3>
                <p className="mt-2 max-w-xs text-sm text-ink/55">{s.body}</p>
              </div>
            ))}
          </div>

          {/* Full 6-step strip */}
          <ol className="mt-16 grid gap-4 rounded-[1.5rem] bg-[#F7F2EA] p-6 sm:grid-cols-2 lg:grid-cols-3 lg:p-8">
            {[
              ["01", "Order", "Free-text list — ₦500 of pepper."],
              ["02", "Assign", "Accept a proposed market agent."],
              ["03", "Quote & pay", "Wallet or bank transfer."],
              ["04", "Shop", "Bargain + vendor transfers."],
              ["05", "Pack & pay", "Final bill, float recycles."],
              ["06", "Deliver", "Courier to your door."],
            ].map(([n, t, b]) => (
              <li key={n} className="flex gap-3 rounded-xl bg-white p-4">
                <span className="font-display text-2xl font-extrabold text-brand-orange/40">{n}</span>
                <div>
                  <p className="font-display font-bold text-ink">{t}</p>
                  <p className="text-sm text-ink/55">{b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PROMO / THREE DOORS GRID — Meal Monkey promo layout */}
      <section id="doors" className="px-4 pb-8 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Large customer card */}
          <div id="customers" className="relative overflow-hidden rounded-[1.75rem] bg-gold/90 p-8 sm:p-10">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/20" />
            <span className="absolute right-6 top-6 rotate-12 rounded-full bg-brand-orange px-4 py-2 font-display text-sm font-bold text-white shadow-lg">
              Waitlist
            </span>
            <h3 className="max-w-sm font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
              Get the market haul without the market day.
            </h3>
            <p className="mt-3 max-w-md text-ink/70">
              Skip queues, haggling, and heavy bags. Join the waitlist for {PILOT}.
            </p>
            <div className="mt-6 max-w-md">
              <WaitlistInline />
            </div>
            <div className="mt-8 flex justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/quika-cat-produce.jpg" alt="" className="h-36 w-36 rounded-full object-cover shadow-xl sm:h-44 sm:w-44" />
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {/* Agent card */}
            <div id="agents" className="relative overflow-hidden rounded-[1.75rem] bg-ink p-6 text-white sm:p-7">
              <span className="absolute right-4 top-4 rounded-md bg-gold px-3 py-1 font-display text-xs font-bold text-ink">
                Agents
              </span>
              <h3 className="max-w-[14rem] font-display text-2xl font-extrabold">
                Earn shopping a market you already know.
              </h3>
              <p className="mt-2 text-sm text-white/60">No unauthorized cash — transfers + photos only.</p>
              <AgentFormCompact />
            </div>

            {/* Partner card */}
            <div id="partners" className="relative overflow-hidden rounded-[1.75rem] bg-brand-orange p-6 text-white sm:p-7">
              <span className="absolute right-4 top-4 flex h-14 w-14 items-center justify-center rounded-full bg-white font-display text-xs font-bold text-brand-orange shadow">
                Deck
              </span>
              <h3 className="font-display text-2xl font-extrabold">Partners & investors</h3>
              <p className="mt-2 max-w-xs text-sm text-white/85">
                Request the deck — float pools, deposits, Paystack transfers.
              </p>
              <a
                href="mailto:partners@quika.ng?subject=Quika%20deck%20request"
                className="mt-4 inline-flex min-h-[40px] items-center rounded-lg bg-ink px-4 font-display text-sm font-bold text-white hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                Contact / request the deck →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* GREEN CLOSING — torn edges */}
      <div className="relative mt-10">
        <Wave fill="#0E7A3C" />
        <section id="coming" className="relative overflow-hidden bg-brand-green px-4 py-20 text-center text-white sm:px-6">
          {/* Floating “partner” circles */}
          <div className="pointer-events-none absolute inset-0">
            {[
              { t: "Paystack", x: "8%", y: "20%" },
              { t: "Transfers", x: "18%", y: "70%" },
              { t: "Float", x: "78%", y: "18%" },
              { t: "Deposit", x: "88%", y: "65%" },
              { t: "Chat", x: "12%", y: "45%" },
              { t: "Courier", x: "82%", y: "42%" },
            ].map((b) => (
              <span
                key={b.t}
                className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold backdrop-blur-sm sm:h-20 sm:w-20 sm:text-xs"
                style={{ left: b.x, top: b.y }}
              >
                {b.t}
              </span>
            ))}
          </div>

          <div className="relative z-10 mx-auto max-w-xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Coming to{" "}
              <span className="underline decoration-gold decoration-4 underline-offset-4">{PILOT}</span>
            </h2>
            <p className="mt-4 text-white/85">
              Pre-pilot — we&apos;re not claiming 400 markets. Join the waitlist, apply as an agent, or open the live app if you already have access.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#customers"
                className="inline-flex min-h-[48px] items-center rounded-full bg-ink px-6 font-display font-bold text-white hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                Join waitlist &gt;
              </a>
              <Link
                href="/login"
                className="inline-flex min-h-[48px] items-center rounded-full bg-white px-6 font-display font-bold text-brand-green hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                Open Quika
              </Link>
            </div>
          </div>
        </section>
        <Wave fill="#0E7A3C" flip />
      </div>

      {/* FOOTER */}
      <footer className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={QUIKA_LOGO_CACHE_KEY}
              src={QUIKA_LOGO_DATA_URI}
              alt=""
              width={96}
              height={70}
              className="h-8 w-auto object-contain"
            />
          </div>
          <p className="text-center text-xs text-white/50">
            © {new Date().getFullYear()} Quika Groceries · Pre-pilot · All rights reserved
          </p>
          <div className="flex gap-3 text-white/70">
            <a href="mailto:hello@quika.ng" className="text-xs font-semibold hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">Email</a>
            <a href="#doors" className="text-xs font-semibold hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">Join</a>
            <Link href="/login" className="text-xs font-semibold hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
