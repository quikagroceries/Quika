"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { DIRECTORY_MARKETS } from "@/lib/marketDirectory";
import { saveGuestDraft } from "@/lib/guestDraft";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import HelpWidget from "@/components/marketing/HelpWidget";
import LanguagePrompt from "@/components/marketing/LanguagePrompt";
import { useT } from "@/lib/locale";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion";
import {
  ADD_ITEM_EVENT,
  ChatDemo,
  DrawUnderline,
  Float,
  FlyLayer,
  PopIn,
  WordReveal,
  useTypedPlaceholder,
} from "@/components/marketing/anim";
import { Blob } from "@/components/marketing/Blob";
import { SectionRider, type RiderArt } from "@/components/marketing/SectionRider";

import tomatoes from "@/assets/illustrations/tomatoes.png";
import garlic from "@/assets/illustrations/garlic.png";
import bananas from "@/assets/illustrations/bananas-1.png";
import pepper from "@/assets/illustrations/pepper.png";
import onion from "@/assets/illustrations/onion.png";
import garri from "@/assets/illustrations/garri.png";
import riceBag from "@/assets/illustrations/rice-bag.png";
import crayfish from "@/assets/illustrations/crayfish.png";
import eggs from "@/assets/illustrations/eggs.png";
import milk from "@/assets/illustrations/milk-carton-1.png";
import bread from "@/assets/illustrations/bread-loaf-1.png";
import chicken from "@/assets/illustrations/roast-chicken.png";
import okra from "@/assets/illustrations/okra.png";
import carrot from "@/assets/illustrations/carrot.png";
import personList from "@/assets/illustrations/person-shopping-list.png";
import conversation from "@/assets/illustrations/agent-customer-conversation.png";
import delivery from "@/assets/illustrations/delivery-map-route.png";
import trustChatTomato from "@/assets/illustrations/trust-chat-tomato.webp";
import finalCtaKitchen from "@/assets/illustrations/final-cta-kitchen.webp";
import heroScene from "@/assets/illustrations/main-hero.png";
import riderHero from "@/assets/illustrations/rider-narrator.webp";
import riderCart from "@/assets/illustrations/shopping-cart.png";
import riderScooterAgent from "@/assets/illustrations/rider-scooter-basket-2.png";
import riderBicycle from "@/assets/illustrations/rider-bicycle.png";
import riderScooterBasket from "@/assets/illustrations/rider-scooter-basket-1.png";
import momoHandoff from "@/assets/illustrations/momo-handoff.webp";
import earnAgentPose from "@/assets/illustrations/char-agent-phone-black.webp";
import earnRiderPose from "@/assets/illustrations/char-rider-scooter.webp";
import stallProduce from "@/assets/illustrations/market-stall-produce.png";
import stallFish from "@/assets/illustrations/vendor-stall-fish.png";
import stallDairy from "@/assets/illustrations/vendor-stall-dairy.png";
import stallPantry from "@/assets/illustrations/vendor-stall-pantry-jars.png";
import stallScale from "@/assets/illustrations/vendor-weighing-scale.png";
import cartVendor from "@/assets/illustrations/market-cart-vendor.png";
import badgeFresh from "@/assets/illustrations/spot-secure-payment.webp";
import badgeLive from "@/assets/illustrations/spot-on-time-delivery.webp";
import badgeHuman from "@/assets/illustrations/spot-reliable-agents.webp";
import badgeSupport from "@/assets/illustrations/spot-verified-goods.webp";
import squiggle2 from "@/assets/illustrations/decorative-squiggle-2.png";
import basket from "@/assets/illustrations/grocery-basket.png";

// What people tap to start a list - Chowdeck's cuisine strip, but for the
// market. Tapping one drops it straight into the list box above.
const QUICK_ITEMS = [
  { label: "Tomatoes", add: "Tomatoes, 1 basket", src: tomatoes },
  { label: "Pepper", add: "Fresh pepper, 1 paint", src: pepper },
  { label: "Onions", add: "Onions, 1 bag", src: onion },
  { label: "Garri", add: "Garri, 2 cups", src: garri },
  { label: "Rice", add: "Rice, 1 bag", src: riceBag },
  { label: "Crayfish", add: "Crayfish, 1 cup", src: crayfish },
  { label: "Eggs", add: "Eggs, 1 crate", src: eggs },
  { label: "Chicken", add: "Chicken, 1 whole", src: chicken },
  { label: "Milk", add: "Milk, 2 cartons", src: milk },
  { label: "Bread", add: "Bread, 2 loaves", src: bread },
  { label: "Okra", add: "Okra, 1 bowl", src: okra },
  { label: "Carrots", add: "Carrots, 1 kg", src: carrot },
  { label: "Bananas", add: "Bananas, 1 bunch", src: bananas },
];

const STEPS = [
  {
    n: "1",
    title: "Write your list",
    body: "Type it like you'd text a friend. No sign-up needed to start.",
    art: personList,
    tint: "bg-surface",
  },
  {
    n: "2",
    title: "Meet your agent",
    body: "A real person in the market picks it up, chats with you and sends photos.",
    art: conversation,
    tint: "bg-[#FBE7D5]",
  },
  {
    n: "3",
    title: "Get it delivered",
    body: "Pay only for what's bought. Track your order all the way to your door.",
    art: delivery,
    tint: "bg-surface",
  },
];

const TRUST = [
  { title: "Pay for what's bought", body: "Unspent cash goes straight back to your wallet.", art: badgeFresh },
  { title: "Live updates", body: "Photos, prices and swaps, in real time, in chat.", art: badgeLive },
  { title: "A person, not a robot", body: "Rated agents who know the stalls and bargain fairly.", art: badgeHuman },
  { title: "Help when you need it", body: "Support is a message away, any time.", art: badgeSupport },
];

const MARKET_ART = [stallProduce, stallFish, stallDairy, stallPantry, stallScale, cartVendor];

function FaqList() {
  const [open, setOpen] = useState<number | null>(0);
  const items = useT().faq.items;
  return (
    <div className="divide-y divide-line rounded-3xl border border-line bg-surface px-5 shadow-sm sm:px-8">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="font-display text-lg font-bold text-ink">{item.q}</span>
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
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="a"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl pb-5 leading-relaxed text-muted">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// The hero's action card: the same first step as the app (write a list),
// carried straight into /shop as a guest draft - so the landing page IS
// step 1, not a picture of it.
function ListStarter({ id }: { id: string }) {
  const router = useRouter();
  const t = useT();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [flash, setFlash] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const placeholder = useTypedPlaceholder(t.hero.placeholders, !text && !focused);

  function addItem(line: string) {
    setText((t) => (t.trim() ? t.replace(/\n*$/, "\n") + line : line));
    ref.current?.focus();
    setFlash(true);
    setTimeout(() => setFlash(false), 700);
  }

  // The "What are you cooking?" strip further down feeds this same box.
  useEffect(() => {
    const onAdd = (e: Event) => addItem((e as CustomEvent<{ line: string }>).detail.line);
    window.addEventListener(ADD_ITEM_EVENT, onAdd);
    return () => window.removeEventListener(ADD_ITEM_EVENT, onAdd);
  }, []);

  async function start(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    try {
      if (text.trim()) {
        // Loaded on demand so the landing page doesn't ship the list builder.
        const { buildDraft } = await import("@/components/ListBuilder");
        const draft = buildDraft("freetext", [{ item: "", price: "", qty: "1", note: "" }], text.trim(), "");
        saveGuestDraft({ marketId: null, step: "list", stagedList: draft, address: "", marketSlug: null });
      }
    } catch {
      /* fall through - the shop still opens, just with an empty list */
    }
    router.push("/shop");
  }

  return (
    <form
      onSubmit={start}
      className="rounded-3xl border border-line bg-surface p-4 shadow-lg sm:p-5"
      aria-label="Start your list"
    >
      <label htmlFor={id} className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-ink">
        <span className="flex h-2 w-2 animate-pulse rounded-full bg-brand-orange" />
        {t.hero.listLabel}
      </label>
      <textarea
        id={id}
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={
          "w-full resize-none rounded-2xl border bg-canvas px-4 py-3 text-base text-ink transition-shadow duration-300 placeholder:text-faint focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange " +
          (flash ? "border-brand-orange ring-4 ring-brand-orange/40" : "border-line-strong")
        }
      />
      <button
        type="submit"
        disabled={busy}
        className="group/cta mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange px-6 font-display text-lg font-bold text-[#1A1A1A] shadow-sm transition hover:bg-brand-orange-dark active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? t.hero.opening : t.hero.button}
        <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-hover/cta:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <p className="mt-3 text-center text-xs text-faint">{t.hero.fine}</p>
      <QuickPicks onPick={addItem} />
    </form>
  );
}

function QuickPicks({ onPick }: { onPick: (line: string) => void }) {
  const t = useT();
  return (
    <div className="mt-4 border-t border-dashed border-line pt-4">
      <p className="mb-2 text-xs font-semibold text-muted">{t.hero.tapToAdd}</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_ITEMS.slice(0, 8).map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => onPick(q.add)}
            className="rounded-full border border-line bg-canvas px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand-orange hover:bg-[#FBE7D5]"
          >
            + {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Eased (smoothstep) fade ramp so the edge dissolves gradually instead of
// showing a visible band where a plain linear gradient starts.
const ramp = (dir: string, len: number) => {
  const stops = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((t) => {
    const a = t * t * (3 - 2 * t);
    return `rgba(0,0,0,${a.toFixed(3)}) ${(t * len).toFixed(1)}%`;
  });
  return `linear-gradient(${dir}, ${stops.join(", ")}, #000 ${len}%)`;
};

const HERO_FADE = [
  ramp("to right", 34),
  ramp("to left", 55),
  ramp("to bottom", 30),
  ramp("to top", 22),
].join(", ");

// One narrator per section, chosen to match what that section is saying.
// Art with lettering on it (QYKA boxes) only ever rides left to right so it
// never mirrors.
const RIDER_ART: Record<string, RiderArt> = {
  hero: { src: riderHero, size: "w-24 sm:w-32 lg:w-36", bump: true },
  tap: { src: riderCart, size: "w-10 sm:w-14 lg:w-16" },
  agent: { src: riderScooterAgent, size: "w-20 sm:w-28 lg:w-32", bump: true },
  markets: { src: riderBicycle, size: "w-20 sm:w-28 lg:w-32", bump: true },
  earn: { src: riderScooterBasket, size: "w-20 sm:w-28 lg:w-32", bump: true },
  faq: { src: conversation, size: "w-24 sm:w-32 lg:w-40" },
  delivered: { src: momoHandoff, size: "w-28 sm:w-40 lg:w-48" },
};

function HeroArt() {
  return (
    <div className="pointer-events-none relative -mx-[6%] w-[112%] lg:-ml-[24%] lg:mr-0 lg:w-[175%]">
      <Image
        src={heroScene}
        alt="A Qyka agent at a market stall, checking a customer's shopping list on the phone"
        className="h-auto w-full"
        style={{
          maskImage: HERO_FADE,
          WebkitMaskImage: HERO_FADE,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
        priority
      />
    </div>
  );
}

export default function MarketingPage() {
  const t = useT();
  const openCount = DIRECTORY_MARKETS.filter((m) => m.status === "pilot").length;

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-canvas text-ink">
      <MarketingHeader />
      <FlyLayer targetId="hero-list" />

      <main className="relative">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <SectionRider caption={t.rider[0]} art={RIDER_ART.hero} first />
          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-2 lg:gap-12 lg:pb-20 lg:pt-16">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/15 px-3 py-1 text-xs font-bold text-brand-orange-dark">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-orange" />
                {t.hero.badge}
              </span>
              <h1 className="mt-4 font-display text-[clamp(2.5rem,6.5vw,4.5rem)] font-extrabold leading-[1.02] tracking-tight text-ink">
                <WordReveal key={t.hero.titleA} text={t.hero.titleA} />{" "}
                {(() => {
                  // Underline just the closing word(s): an underline under a
                  // long, wrapped phrase stretches into a full-width bar.
                  const w = t.hero.titleB.split(" ");
                  const k = w.length >= 3 ? 2 : w.length;
                  const lead = w.slice(0, w.length - k).join(" ");
                  const tail = w.slice(w.length - k).join(" ");
                  return (
                    <>
                      {lead && <WordReveal key={lead} text={lead} delay={0.2} />}{lead && " "}
                      <span className="relative inline-block">
                        <WordReveal key={tail} text={tail} delay={0.3} />
                        <DrawUnderline delay={0.95} />
                      </span>
                    </>
                  );
                })()}
              </h1>
              <Reveal y={16} delay={0.35}>
                <p className="mt-4 max-w-md text-lg text-muted">
                  {t.hero.sub}
                </p>
              </Reveal>
              <div className="mt-7 max-w-md">
                <ListStarter id="hero-list" />
              </div>
            </div>
            <HeroArt />
          </div>
        </section>

        {/* SHOP BY ITEM - Chowdeck-style scroller */}
        <section className="relative border-y border-line bg-surface">
          <SectionRider caption={t.rider[1]} art={RIDER_ART.tap} mode="pulse" corner />
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <Reveal y={14}><h2 className="mb-4 font-display text-xl font-extrabold text-ink sm:text-2xl">{t.strip.title}</h2></Reveal>
            <div className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {QUICK_ITEMS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    window.dispatchEvent(
                      new CustomEvent(ADD_ITEM_EVENT, {
                        detail: { line: q.add, src: q.src.src, from: { left: r.left + r.width / 2 - 28, top: r.top + 16, width: r.width, height: r.height } },
                      })
                    );
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="group flex w-24 shrink-0 snap-start flex-col items-center gap-2 sm:w-28"
                >
                  <span className="flex h-24 w-24 items-center justify-center rounded-full bg-canvas ring-1 ring-line transition group-hover:bg-[#FBE7D5] group-hover:ring-brand-orange sm:h-28 sm:w-28">
                    <Image src={q.src} alt="" className="h-14 w-14 object-contain transition duration-300 group-hover:-rotate-6 group-hover:scale-[1.15] group-active:scale-90 sm:h-16 sm:w-16" />
                  </span>
                  <span className="text-sm font-semibold text-ink">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="relative scroll-mt-24 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <SectionRider caption={t.rider[2]} art={RIDER_ART.agent} dir="rtl" />
          <Reveal className="max-w-xl">
            <p className="font-display text-sm font-bold uppercase tracking-[0.12em] text-brand-orange-dark">{t.how.eyebrow}</p>
            <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-tight tracking-tight">
              {t.how.title}
            </h2>
          </Reveal>
          <Stagger className="mt-10 grid gap-5 md:grid-cols-3" stagger={0.14}>
            {STEPS.map((s, si) => (
              <StaggerItem key={s.n} y={40}>
              <div
                className={"relative flex h-full flex-col overflow-hidden rounded-3xl border border-line p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 sm:p-7 " + s.tint}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange font-display text-lg font-extrabold text-[#1A1A1A]">
                  {s.n}
                </span>
                <h3 className="mt-4 font-display text-2xl font-extrabold">{t.how.steps[si].title}</h3>
                <p className="mt-2 text-muted">{t.how.steps[si].body}</p>
                <Float amp={5} dur={3.6 + si * 0.5} className="mt-6"><Image src={s.art} alt="" aria-hidden className="h-44 w-full object-contain" /></Float>
              </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* MARKETS */}
        <section id="markets" className="relative scroll-mt-24 border-y border-line bg-surface">
          <SectionRider caption={t.rider[3]} art={RIDER_ART.markets} />
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <Reveal className="max-w-xl">
                <p className="font-display text-sm font-bold uppercase tracking-[0.12em] text-brand-orange-dark">{t.markets.eyebrow}</p>
                <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-tight tracking-tight">
                  {t.markets.title}
                </h2>
                <p className="mt-2 text-muted">
                  {t.markets.sub(openCount)}
                </p>
              </Reveal>
              <Link href="/markets" className="font-display font-bold text-brand-orange-dark hover:underline">
                {t.markets.all}
              </Link>
            </div>
            <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.09}>
              {DIRECTORY_MARKETS.slice(0, 6).map((m, i) => {
                const open = m.status === "pilot";
                return (
                  <StaggerItem key={m.id} y={32}>
                  <Link
                    href={open ? `/shop?market=${m.id}` : `/markets/${m.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-canvas transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex h-40 items-center justify-center bg-[#FBE7D5]/70">
                      <Image
                        src={MARKET_ART[i % MARKET_ART.length]}
                        alt=""
                        aria-hidden
                        className="h-32 w-auto object-contain transition group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-xl font-extrabold">{m.name}</h3>
                        <span
                          className={
                            "shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-bold " +
                            (open ? "bg-brand-green/15 text-brand-green" : "bg-brand-orange/20 text-brand-orange-dark")
                          }
                        >
                          {open && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-green align-middle" />}
                          {open ? t.markets.open : t.markets.soon}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-faint">
                        {m.city} · {m.venueType === "supermarket" ? t.markets.supermarket : t.markets.local}
                      </p>
                      <p className="mt-2 line-clamp-2 text-muted">{m.blurb}</p>
                      <span className="mt-4 font-display text-sm font-bold text-ink">
                        {open ? t.markets.startHere : t.markets.notify}
                      </span>
                    </div>
                  </Link>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </div>
        </section>

        {/* TRUST */}
        <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface p-6 shadow-sm sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-orange/10 blur-3xl" />
            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <Reveal x={-30} y={0}>
                <p className="font-display text-sm font-bold uppercase tracking-[0.12em] text-brand-orange-dark">{t.trust.eyebrow}</p>
                <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-tight tracking-tight">
                  {t.trust.title}
                </h2>
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  {TRUST.map((tr, ti) => (
                    <div key={ti} className="flex gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-canvas ring-1 ring-line">
                        <Image src={tr.art} alt="" aria-hidden className="h-8 w-8 object-contain" />
                      </span>
                      <div>
                        <h3 className="font-display font-bold text-ink">{t.trust.points[ti].title}</h3>
                        <p className="text-sm text-muted">{t.trust.points[ti].body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
              <Reveal x={30} y={0} className="relative">
                <div className="absolute inset-4 rotate-2 rounded-[2rem] bg-brand-orange/25" />
                <Float amp={5} dur={5}>
                  <Image
                    src={trustChatTomato}
                    alt="An agent sending a photo of fresh tomatoes before buying them"
                    className="relative mx-auto w-full max-w-md object-contain"
                  />
                </Float>
                <ChatDemo key={t.trust.chat[0]} lines={t.trust.chat} className="absolute -bottom-2 left-0 sm:left-2" />
              </Reveal>
            </div>
          </div>
        </section>

        {/* EARN */}
        <section className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
          <SectionRider caption={t.rider[4]} art={RIDER_ART.earn} dir="rtl" />
          <div className="grid gap-5 md:grid-cols-2">
            <Reveal x={-36} y={0} className="h-full">
            <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-brand-orange p-7 sm:p-9">
              <h2 className="font-display text-3xl font-extrabold leading-tight text-[#1A1A1A] sm:text-4xl">
                {t.earn.agent.title}
              </h2>
              <p className="mt-2 max-w-sm text-[#1A1A1A]/80">{t.earn.agent.body}</p>
              <Link
                href="/for-agents"
                className="mt-6 inline-flex min-h-[48px] w-fit items-center rounded-full bg-surface px-6 font-display font-bold text-ink shadow-sm transition hover:bg-canvas active:scale-[0.98]"
              >
                {t.earn.agent.cta}
              </Link>
              <div className="mt-6 rounded-3xl bg-surface p-3">
                <Float amp={4} dur={3.8}><Image src={earnAgentPose} alt="" aria-hidden className="mx-auto h-44 object-contain" /></Float>
              </div>
            </div>
            </Reveal>
            <Reveal x={36} y={0} className="h-full">
            <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-line bg-surface p-7 shadow-sm sm:p-9">
              <h2 className="font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
                {t.earn.rider.title}
              </h2>
              <p className="mt-2 max-w-sm text-muted">{t.earn.rider.body}</p>
              <Link
                href="/for-riders"
                className="mt-6 inline-flex min-h-[48px] w-fit items-center rounded-full bg-brand-orange px-6 font-display font-bold text-[#1A1A1A] shadow-sm transition hover:bg-brand-orange-dark active:scale-[0.98]"
              >
                {t.earn.rider.cta}
              </Link>
              <Float amp={4} dur={3.2}><Image src={earnRiderPose} alt="" aria-hidden className="mx-auto mt-6 h-52 object-contain" /></Float>
            </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="relative scroll-mt-24 border-t border-line bg-surface">
          <SectionRider caption={t.rider[5]} art={RIDER_ART.faq} mode="still" at={6} />
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-[0.12em] text-brand-orange-dark">{t.faq.eyebrow}</p>
              <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-tight tracking-tight">
                {t.faq.title}
              </h2>
              <p className="mt-2 text-muted">{t.faq.lede}</p>
              <Link href="/help" className="mt-4 inline-block font-display font-bold text-brand-orange-dark hover:underline">
                {t.faq.link}
              </Link>
            </div>
            <FaqList />
          </div>
        </section>

        {/* FINAL CTA - the payoff scene: groceries already unpacked on the
            customer's own counter, "order completed" on the phone. Real
            illustration now, replacing the old scattered basket/produce
            sprites (that piece already shows a basket, tomatoes and
            peppers, so those separate floating pieces were redundant). */}
        <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <SectionRider caption={t.rider[6]} art={RIDER_ART.delivered} mode="still" at={6} />
          <div className="relative grid items-center gap-8 overflow-hidden rounded-[2rem] bg-[#FBE7D5] p-7 sm:p-12 lg:grid-cols-2">
            <Reveal className="relative max-w-xl">
              <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-tight tracking-tight text-ink">
                {t.cta.title}
              </h2>
              <p className="mt-3 text-lg text-ink/70">{t.cta.body}</p>
              <Link
                href="/shop"
                className="mt-7 inline-flex min-h-[56px] items-center gap-2 rounded-full bg-brand-orange px-8 font-display text-lg font-bold text-[#1A1A1A] shadow-md transition hover:bg-brand-orange-dark active:scale-[0.98]"
              >
                {t.cta.button}
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </Reveal>
            <PopIn inView from={{ scale: 0.9, y: 24 }}>
              <Float amp={4} dur={5}>
                <Blob className="aspect-square w-full">
                  <Image
                    src={finalCtaKitchen}
                    alt="Fresh groceries unpacked on a kitchen counter, order completed"
                    className="h-full w-full object-contain"
                  />
                </Blob>
              </Float>
            </PopIn>
          </div>
        </section>
      </main>

      <MarketingFooter />
      <HelpWidget />
      <LanguagePrompt />
    </div>
    </MotionConfig>
  );
}
