"use client";

import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import Link from "next/link";
import CountUpNumber from "@/components/marketing/CountUpNumber";
import DeviceMockup from "@/components/marketing/DeviceMockup";
import HelpWidget from "@/components/marketing/HelpWidget";
import ImagePlaceholder from "@/components/marketing/ImagePlaceholder";
import MarketShopPicker from "@/components/marketing/MarketShopPicker";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import { HeroIn, Reveal, Stagger, StaggerItem, ClipReveal } from "@/components/marketing/motion";
import SplitReveal from "@/components/marketing/SplitReveal";
import { DIRECTORY_MARKETS } from "@/lib/marketDirectory";
import { hashFromHref, scrollToSection } from "@/lib/scrollToSection";
import { FAQS, HELP_TOPICS, PILOT } from "@/lib/helpContent";

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-ink/10 border-y border-ink/10">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-start justify-between gap-6 py-5 text-left transition hover:text-brand-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:py-6"
            >
              <span className="font-display text-lg font-bold tracking-tight text-ink sm:text-xl">
                {item.q}
              </span>
              <span
                className={
                  "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink transition " +
                  (isOpen ? "rotate-45 border-brand-orange text-brand-orange" : "")
                }
                aria-hidden
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <p className="max-w-2xl pb-6 text-base leading-relaxed text-ink/60 sm:pb-7">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WaitlistInline({ inputId = "waitlist-email" }: { inputId?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [marketLabel, setMarketLabel] = useState(PILOT);

  useEffect(() => {
    function syncMarket() {
      const id = new URLSearchParams(window.location.search).get("market");
      if (!id) return;
      const match = DIRECTORY_MARKETS.find((m) => m.id === id);
      if (match) setMarketLabel(match.name);
    }
    syncMarket();
    window.addEventListener("qyka-market-change", syncMarket);
    window.addEventListener("popstate", syncMarket);
    return () => {
      window.removeEventListener("qyka-market-change", syncMarket);
      window.removeEventListener("popstate", syncMarket);
    };
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    const subject = encodeURIComponent(`Qyka waitlist — ${marketLabel}`);
    const body = encodeURIComponent(
      `Join waitlist for ${marketLabel}.\n\nEmail: ${email.trim()}\n`
    );
    window.location.href = `mailto:hello@quika.ng?subject=${subject}&body=${body}`;
    setSent(true);
  }

  if (sent) {
    return <p className="text-sm font-semibold text-brand-green">Opening your mail app…</p>;
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md overflow-hidden rounded-full bg-white shadow-[0_10px_30px_rgba(33,26,20,0.1)] ring-1 ring-ink/5">
      <label className="sr-only" htmlFor={inputId}>Email for waitlist</label>
      <input
        id={inputId}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={`Waitlist for ${marketLabel}…`}
        className="min-h-[52px] flex-1 bg-transparent px-5 text-sm text-ink outline-none placeholder:text-ink/40"
      />
      <button
        type="submit"
        className="m-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[#1A1A1A] transition hover:bg-brand-orange-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
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

function handleInPageAnchor(e: MouseEvent<HTMLAnchorElement>) {
  const hash = hashFromHref(e.currentTarget.getAttribute("href") || "");
  if (!hash) return;
  e.preventDefault();
  scrollToSection(hash);
  window.history.pushState(null, "", `/#${hash}`);
}

const STATS = [
  { value: 0, suffix: "", label: "unauthorized cash on any run — transfer only" },
  { value: 100, suffix: "%", label: "of vendor payments photographed as proof" },
  { value: 3, suffix: "", label: "ways to work with Qyka — shop, agent, or rider" },
] as const;

type StartCard = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  img?: string;
  imgAlt?: string;
  placeholder?: { label: string; file: string };
  tone: "orange" | "ink" | "green";
};

const START_CARDS: StartCard[] = [
  {
    id: "customers",
    eyebrow: "Customers",
    title: "Get your groceries, without the trip.",
    body: "Send a free-text list — market or supermarket — pick where to shop it, and deposit to lock the run.",
    cta: "Open Qyka",
    href: "/shop",
    img: "/qyka-hero-person.jpg",
    imgAlt: "Customer with a market shopping list",
    tone: "orange",
  },
  {
    id: "agents",
    eyebrow: "Agents",
    title: "Earn shopping a market you already know.",
    body: "Accept proposed runs, bargain the stalls, pay vendors by transfer, and get paid on completed deliveries.",
    cta: "Become an Agent",
    href: "/for-agents",
    img: "/qyka-cat-produce.jpg",
    imgAlt: "Agent shopping fresh produce at a market stall",
    tone: "ink",
  },
  {
    id: "riders",
    eyebrow: "Riders",
    title: "Deliver market hauls, earn on your own schedule.",
    body: "Pick up a packed order at the market gate and ride it home. Flexible hours, paid per completed delivery.",
    cta: "Become a Rider",
    href: "/for-riders",
    placeholder: { label: "Rider on a delivery bike with packed market bags", file: "/qyka-rider-hero.jpg" },
    tone: "green",
  },
];

const TONE_BG: Record<StartCard["tone"], string> = {
  orange: "bg-brand-orange",
  ink: "bg-ink",
  green: "bg-brand-green",
};

function StartTile({ card }: { card: StartCard }) {
  return (
    <div>
    <Link
      href={card.href}
      data-cursor={card.cta}
      className="group relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl text-white shadow-[0_1px_2px_rgba(33,26,20,0.06)] transition hover:shadow-[0_24px_48px_-12px_rgba(33,26,20,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
    >
      <div className={"absolute inset-0 " + TONE_BG[card.tone]} />
      <div className="absolute inset-0">
        {card.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.img}
            alt={card.imgAlt || ""}
            className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
          />
        ) : (
          <ImagePlaceholder
            label={card.placeholder!.label}
            file={card.placeholder!.file}
            tone="dark"
            align="top"
            className="h-full w-full"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      </div>

      <div className="relative z-[1] mt-auto flex flex-col gap-2 p-7 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">{card.eyebrow}</p>
        <h3 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.65rem]">
          {card.title}
        </h3>
        <p className="max-w-sm text-sm leading-relaxed text-white/75">{card.body}</p>
        <span className="mt-3 inline-flex items-center gap-2 font-display text-sm font-bold">
          {card.cta}
          <svg viewBox="0 0 24 24" className="h-4 w-4 transition group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
    </div>
  );
}

const CATEGORIES = [
  { img: "/qyka-cat-produce.jpg", title: "Fresh produce", body: "Tomatoes, peppers, leafy greens — bargained by weight at the market." },
  { img: "/qyka-cat-protein.jpg", title: "Proteins & fish", body: "Meat, fish, and poultry, priced the way the stall sells it." },
  { img: "/qyka-cat-pantry.jpg", title: "Pantry & provisions", body: "Rice, garri, oil, and the rest of the weekly list." },
  {
    placeholder: { label: "Supermarket shelf goods — toiletries, cleaning, packaged food", file: "/qyka-cat-supermarket.jpg" },
    title: "Household & supermarket",
    body: "Toiletries, cleaning supplies, and packaged groceries at fixed shelf prices.",
  },
] as const;

const TRUST_POINTS = [
  { t: "Agents hold no cash", d: "Every vendor is paid by bank transfer — nothing changes hands off the books." },
  { t: "Photo proof on every spend", d: "Each transfer is logged with a photo of what it bought." },
  { t: "Capped spending", d: "Hard ceilings on every run — overages need your explicit OK first." },
  { t: "Deposit before assignment", d: "Runs only start once payment clears, so there's no ambiguity on either side." },
] as const;

export default function MarketingPage() {
  useEffect(() => {
    const scrollFromHash = (behavior: ScrollBehavior = "smooth") => {
      const fromStorage = sessionStorage.getItem("qyka-scroll-to");
      if (fromStorage) {
        sessionStorage.removeItem("qyka-scroll-to");
        requestAnimationFrame(() => scrollToSection(fromStorage, behavior));
        return;
      }
      const id = window.location.hash.replace(/^#/, "");
      if (id) requestAnimationFrame(() => scrollToSection(id, behavior));
    };

    scrollFromHash("smooth");

    const onHashChange = () => scrollFromHash("smooth");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <div className="force-light min-h-screen bg-canvas text-ink">
      <MarketingHeader />

      {/* HERO — split: headline + market picker on the left, real product UI on the right */}
      <section className="relative overflow-hidden bg-canvas">
        <div className="relative z-[1] mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-20 lg:pt-20">
          <div>
            <HeroIn y={20}>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">
                Pre-pilot · Groceries, from open-air markets to supermarkets
              </p>
            </HeroIn>
            <SplitReveal
              as="h1"
              mode="load"
              delay={0.08}
              className="mt-3 font-serif text-5xl italic leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-[4rem]"
            >
              Your groceries, <span className="text-brand-orange">shopped right</span>.
            </SplitReveal>
            <HeroIn y={20} delay={0.16}>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-ink/60 sm:text-lg">
                Send a free-text list for anything on it — market produce or supermarket
                staples. A local agent shops it and pays by transfer. A rider brings it to
                your door. No cash on the street.
              </p>
            </HeroIn>
            <HeroIn y={16} delay={0.24} className="mt-8 max-w-xl">
              <HeroCtas />
            </HeroIn>
            <HeroIn y={12} delay={0.32}>
              <p className="mt-3 text-xs font-medium text-ink/40">
                Pilot markets open Qyka today; everyone else joins the waitlist.
              </p>
            </HeroIn>
          </div>

          <HeroIn y={32} delay={0.2} className="relative mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
            <div className="relative mx-auto w-full max-w-[300px]">
              <DeviceMockup />
              <div className="absolute -left-10 -top-4 hidden -rotate-3 rounded-xl bg-white px-4 py-3 shadow-[0_16px_36px_rgba(33,26,20,0.16)] sm:block">
                <p className="text-xs font-bold text-ink">₦500 pepper</p>
                <p className="text-[0.7rem] text-ink/50">added to list</p>
              </div>
              <div className="absolute -right-12 -bottom-4 hidden rotate-2 rounded-xl bg-ink px-4 py-3 text-white shadow-[0_16px_36px_rgba(33,26,20,0.24)] sm:block">
                <p className="text-xs font-bold">Transfer sent</p>
                <p className="text-[0.7rem] text-white/60">photo attached</p>
              </div>
            </div>
          </HeroIn>
        </div>

        {/* Stat strip */}
        <div className="border-t border-ink/8 bg-canvas-deep/60">
          <Stagger className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-ink/8 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6" stagger={0.1}>
            {STATS.map((s) => (
              <StaggerItem key={s.label} y={16} scale={0.98}>
                <div className="flex items-center gap-3 px-1 py-5 sm:flex-col sm:items-start sm:px-6">
                  <CountUpNumber
                    value={s.value}
                    suffix={s.suffix}
                    className="font-serif text-3xl italic text-ink sm:text-4xl"
                  />
                  <span className="text-sm text-ink/55 sm:mt-1">{s.label}</span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>


      {/* GET STARTED — three audiences, Uber/Bolt-style split */}
      <section id="get-started" className="relative scroll-mt-28 bg-canvas px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal y={24} className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">Get started</p>
            <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight text-ink sm:text-5xl">
              Three ways to work with Qyka.
            </SplitReveal>
            <p className="mt-3 text-base text-ink/60 sm:text-lg">
              Shop a market, run one, or deliver one — pick where you fit in.
            </p>
          </Reveal>

          <Stagger className="mt-10 grid gap-5 lg:grid-cols-3" stagger={0.1}>
            {START_CARDS.map((card) => (
              <StaggerItem key={card.id} y={32} scale={0.97}>
                <StartTile card={card} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ACTION — market-first entry, repeated for scrollers who skipped the hero */}
      {/* brand-orange is a light peach fill now, not the old dark indigo —
          content here needs dark ink text, and the picker's "inverse"
          (white-text-on-dark) tone no longer applies. */}
      <section id="action" className="relative scroll-mt-28 bg-brand-orange px-4 py-16 sm:px-6 sm:py-20">
        <Reveal className="mx-auto max-w-6xl" y={28}>
          <div className="grid gap-10 text-ink lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-ink/70">Shop your groceries</p>
              <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic leading-tight tracking-tight sm:text-5xl">
                Enter the market or supermarket you buy from.
              </SplitReveal>
              <p className="mt-4 max-w-md text-base text-ink/70 sm:text-lg">
                Qyka is built around specific markets and supermarkets, not delivery zones. Pick
                yours to open the app, or join the waitlist if it isn&apos;t live yet.
              </p>
            </div>
            <div className="lg:justify-self-end lg:pr-2">
              <MarketShopPicker inputId="action-market-picker" />
            </div>
          </div>
        </Reveal>
      </section>


      {/* CATEGORIES */}
      <section className="relative bg-canvas px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal y={24} className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">Groceries</p>
            <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight text-ink sm:text-5xl">
              Everything on your list, one run.
            </SplitReveal>
            <p className="mt-3 text-base text-ink/60 sm:text-lg">
              Fresh market produce, bargained at the stalls, or fixed-price supermarket
              staples — Qyka shops both.
            </p>
          </Reveal>

          <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" stagger={0.12}>
            {CATEGORIES.map((c) => (
              <StaggerItem key={c.title} y={28} scale={0.97}>
                <a
                  href="#action"
                  onClick={handleInPageAnchor}
                  data-cursor="Shop"
                  className="group block overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(33,26,20,0.06)] ring-1 ring-ink/5 transition hover:shadow-[0_16px_36px_-8px_rgba(33,26,20,0.2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
                >
                  <ClipReveal className="aspect-[4/3] overflow-hidden">
                    {"img" in c ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.img}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <ImagePlaceholder label={c.placeholder.label} file={c.placeholder.file} className="h-full w-full" />
                    )}
                  </ClipReveal>
                  <div className="p-5">
                    <h3 className="font-display text-lg font-bold text-ink">{c.title}</h3>
                    <p className="mt-1 text-sm text-ink/55">{c.body}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange">
                      Choose where to shop
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* TRUST — flat white band, proof-photo mosaic instead of a single hero shot.
          No dark surfaces anywhere in this palette. */}
      <section id="trust" className="relative scroll-mt-28 bg-surface text-ink">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <Reveal y={24}>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange-dark">Trust & safety</p>
            <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic leading-tight tracking-tight sm:text-5xl">
              Built for markets with no catalogue and no receipts by default.
            </SplitReveal>
            <p className="mt-4 max-w-md text-ink/65">
              Qyka&apos;s differentiator isn&apos;t speed — it&apos;s how money moves when there&apos;s no
              storefront to fall back on.
            </p>
            <Link
              href="/trust-and-safety"
              className="mt-5 inline-flex text-sm font-bold text-brand-orange-dark hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              Read Trust &amp; Safety →
            </Link>

            <Stagger className="mt-10 space-y-6" stagger={0.1}>
              {TRUST_POINTS.map((f) => (
                <StaggerItem key={f.t} x={0} y={16} scale={0.98}>
                  <div className="flex gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-green">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="white" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-display font-bold">{f.t}</p>
                      <p className="text-sm text-ink/55">{f.d}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>

          <Reveal y={32} delay={0.1} className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { src: "/qyka-trust-basket.jpg", alt: "Packed market basket ready for delivery" },
              { src: "/qyka-cat-produce.jpg", alt: "Fresh produce bought for a run" },
              { src: "/qyka-cat-protein.jpg", alt: "Protein purchased at a market stall" },
              { src: "/qyka-cat-pantry.jpg", alt: "Pantry items ready to pack" },
            ].map((img, i) => (
              <ClipReveal
                key={img.src}
                delay={i * 0.08}
                direction={i % 2 === 0 ? "left" : "right"}
                className={"aspect-square w-full overflow-hidden rounded-xl " + (i % 2 === 1 ? "mt-6" : "")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
              </ClipReveal>
            ))}
          </Reveal>
        </div>
      </section>


      {/* HELP — replaces the old step-by-step walkthrough */}
      <section id="help" className="relative scroll-mt-28 bg-canvas px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal y={24} className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">Help</p>
            <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight text-ink sm:text-5xl">
              Answers, sorted by what you&apos;re trying to do.
            </SplitReveal>
            <p className="mt-3 text-base text-ink/60 sm:text-lg">
              Pick a topic, or skip straight to a real person.
            </p>
          </Reveal>

          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
            {HELP_TOPICS.map((topic) => {
              const hash = hashFromHref(topic.href);
              const content = (
                <>
                  <h3 className="font-display text-lg font-bold text-ink">{topic.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/55">{topic.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange">
                    Go
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </>
              );
              const className =
                "block h-full rounded-2xl border border-ink/8 bg-white p-6 transition hover:border-brand-orange/30 hover:shadow-[0_12px_28px_-8px_rgba(33,26,20,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold";
              return (
                <StaggerItem key={topic.title} y={24} scale={0.98}>
                  {hash ? (
                    <a href={topic.href} onClick={handleInPageAnchor} className={className}>
                      {content}
                    </a>
                  ) : topic.href.startsWith("mailto:") ? (
                    <a href={topic.href} className={className}>
                      {content}
                    </a>
                  ) : (
                    <Link href={topic.href} className={className}>
                      {content}
                    </Link>
                  )}
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative scroll-mt-28 bg-canvas px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <Reveal y={24} className="lg:pt-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">FAQ</p>
            <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight text-ink sm:text-6xl">
              Questions, <span className="text-brand-orange">answered</span>.
            </SplitReveal>
            <p className="mt-4 max-w-md text-base text-ink/60 sm:text-lg">
              How lists, money, agents, and riders work on Qyka — before you join the waitlist.
            </p>
            <a
              href="mailto:hello@quika.ng?subject=Qyka%20question"
              className="mt-6 inline-flex text-sm font-bold text-brand-orange hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Still curious? Email us →
            </a>
          </Reveal>

          <Reveal y={28} delay={0.08}>
            <FaqAccordion />
          </Reveal>
        </div>
      </section>


      {/* CLOSE — flat white band, primary CTA plus quieter secondary asks.
          No dark surfaces anywhere in this palette — differentiation from
          the cream page comes from bg-surface (white), not a dark fill. */}
      <section id="start" className="relative scroll-mt-28 bg-surface px-4 py-20 text-ink sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal y={24} className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-ink/60">Start here</p>
            <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic leading-tight tracking-tight sm:text-5xl">
              Your list. Our agents. Your door.
            </SplitReveal>
            <p className="mt-4 max-w-md text-base text-ink/70 sm:text-lg">
              Free-text grocery orders — market or supermarket. Shopped and paid by transfer,
              rider home.
            </p>
            <Stagger className="mt-8 flex flex-wrap gap-3" stagger={0.1}>
              <StaggerItem y={12} scale={0.96}>
                <Link
                  href="/shop"
                  className="inline-flex min-h-[48px] items-center rounded-full bg-brand-orange px-6 font-display text-sm font-bold text-[#1A1A1A] transition hover:bg-brand-orange-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                >
                  Open Qyka
                </Link>
              </StaggerItem>
              <StaggerItem y={12} scale={0.96}>
                <a
                  href="#action"
                  onClick={handleInPageAnchor}
                  className="inline-flex min-h-[48px] items-center rounded-full border-2 border-ink/15 px-6 font-display text-sm font-bold text-ink transition hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                >
                  Choose a market
                </a>
              </StaggerItem>
            </Stagger>
          </Reveal>

          <Reveal y={20} delay={0.1} className="mt-14 grid gap-6 border-t border-ink/10 pt-10 sm:grid-cols-3">
            <div>
              <p className="font-display font-bold">Join the waitlist</p>
              <p className="mt-1 text-sm text-ink/60">Not in {PILOT} yet? We&apos;ll email you the moment it opens.</p>
              <div className="mt-4">
                <WaitlistInline inputId="waitlist-email-close" />
              </div>
            </div>
            <div>
              <p className="font-display font-bold">Work with Qyka</p>
              <p className="mt-1 text-sm text-ink/60">Shop for us or deliver for us.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/for-agents" className="inline-flex min-h-[40px] items-center rounded-full bg-brand-orange/10 px-4 text-sm font-bold text-brand-orange-dark transition hover:bg-brand-orange/20">
                  Become an Agent
                </Link>
                <Link href="/for-riders" className="inline-flex min-h-[40px] items-center rounded-full bg-brand-orange/10 px-4 text-sm font-bold text-brand-orange-dark transition hover:bg-brand-orange/20">
                  Become a Rider
                </Link>
              </div>
            </div>
            <div>
              <p className="font-display font-bold">Partners & investors</p>
              <p className="mt-1 text-sm text-ink/60">Request the deck — float pools, deposits, transfer rails.</p>
              <a
                href="mailto:partners@quika.ng?subject=Qyka%20deck%20request"
                className="mt-4 inline-flex min-h-[40px] items-center rounded-full bg-brand-orange/10 px-4 text-sm font-bold text-brand-orange-dark transition hover:bg-brand-orange/20"
              >
                Contact / request the deck →
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <MarketingFooter />
      <HelpWidget />
    </div>
  );
}

/** Market-first entry — same control as the orange shop band. */
function HeroCtas() {
  return (
    <div className="max-w-xl">
      <MarketShopPicker inputId="hero-market-picker" />
    </div>
  );
}
