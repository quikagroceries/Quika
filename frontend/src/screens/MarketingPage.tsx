"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from "framer-motion";
import { BoltMark } from "@/components/marketing/BoltBasket";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import { FoodScatter, SoftCircles } from "@/components/marketing/MarketDecor";
import Wave from "@/components/marketing/Wave";
import { hashFromHref, scrollToSection } from "@/lib/scrollToSection";

const PILOT = "our first pilot market";
const EASE = [0.22, 1, 0.36, 1] as const;

/** Scroll-triggered reveal — fade + direction + optional scale */
function Reveal({
  children,
  className = "",
  delay = 0,
  x = 0,
  y = 36,
  scale,
  duration = 0.75,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  x?: number;
  y?: number;
  scale?: number;
  duration?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x, y, scale: scale ?? 1 }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-12% 0px -6% 0px", amount: 0.25 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function Stagger({
  children,
  className = "",
  stagger = 0.1,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10% 0px", amount: 0.2 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({
  children,
  className = "",
  y = 40,
  x = 0,
  scale = 0.94,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  x?: number;
  scale?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y, x, scale },
        show: {
          opacity: 1,
          y: 0,
          x: 0,
          scale: 1,
          transition: { duration: 0.7, ease: EASE },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Gentle scroll-linked vertical parallax */
function Parallax({
  children,
  className = "",
  offset = 48,
}: {
  children: ReactNode;
  className?: string;
  offset?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const rawY = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  const y = useSpring(rawY, { stiffness: 90, damping: 28, mass: 0.4 });
  const style: MotionStyle | undefined = reduceMotion ? undefined : { y };

  return (
    <motion.div ref={ref} style={style} className={className}>
      {children}
    </motion.div>
  );
}

function FeatureRow({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  const reduceMotion = useReducedMotion();
  const className = "flex items-start gap-3";
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-[0_10px_28px_rgba(33,26,20,0.12)]">
        {icon}
      </span>
      <div className="pt-0.5">
        <p className="font-display text-sm font-bold tracking-tight text-ink">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-ink/55">{body}</p>
      </div>
    </>
  );
  if (reduceMotion) return <div className={className}>{content}</div>;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, x: 24 },
        show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
      }}
    >
      {content}
    </motion.div>
  );
}

function HeroPortrait() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="relative aspect-square w-full max-w-[540px] lg:mx-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[11%] rounded-full bg-ink/10 blur-2xl"
      />

      <motion.div
        className="absolute inset-[9%] rounded-full bg-gold"
        initial={reduceMotion ? false : { scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
      />

      <motion.div
        aria-hidden
        className="absolute inset-[11.5%] rounded-full border-[1.5px] border-dashed border-ink/25"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={reduceMotion ? undefined : { duration: 48, ease: "linear", repeat: Infinity }}
      />

      <motion.div
        className="absolute inset-[13%] overflow-hidden rounded-full bg-gold"
        initial={reduceMotion ? false : { scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/quika-hero-person.jpg"
          alt="Shopper with a market basket"
          className="h-full w-full object-cover"
        />
      </motion.div>

      <motion.svg
        viewBox="0 0 200 200"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
        initial={reduceMotion ? false : { opacity: 0, rotate: -8 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 1, delay: 0.35, ease: EASE }}
      >
        <circle
          cx="100"
          cy="100"
          r="94"
          fill="none"
          stroke="#0E7A3C"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray="48 542"
          transform="rotate(-40 100 100)"
        />
        <circle
          cx="100"
          cy="100"
          r="94"
          fill="none"
          stroke="#C9C2B6"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray="42 548"
          transform="rotate(28 100 100)"
        />
        <circle
          cx="100"
          cy="100"
          r="94"
          fill="none"
          stroke="#E8541E"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray="54 536"
          transform="rotate(205 100 100)"
        />
      </motion.svg>
    </div>
  );
}

function WaitlistInline({ inputId = "waitlist-email" }: { inputId?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent) {
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
      <label className="sr-only" htmlFor={inputId}>Email for waitlist</label>
      <input
        id={inputId}
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

function handleInPageAnchor(e: MouseEvent<HTMLAnchorElement>) {
  const hash = hashFromHref(e.currentTarget.getAttribute("href") || "");
  if (!hash) return;
  e.preventDefault();
  scrollToSection(hash);
  window.history.pushState(null, "", `/#${hash}`);
}

/** Meal Monkey–style hero CTAs: green primary + play “How to order” */
function HeroCtas() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-wrap items-center gap-5 sm:gap-7">
      <a
        href="#customers"
        onClick={handleInPageAnchor}
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
        onClick={handleInPageAnchor}
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

/** Uses `/quika-app-phone.png` when present; otherwise a phone-shaped placeholder. */
function AppPhoneSlot({ className = "" }: { className?: string }) {
  const [hasPhoneArt, setHasPhoneArt] = useState(true);
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={"relative " + className}
      animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 5.5, ease: "easeInOut", repeat: Infinity }
      }
    >
      {hasPhoneArt ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/quika-app-phone.png"
          alt="Quika on mobile"
          className="relative w-full drop-shadow-[0_28px_48px_rgba(33,26,20,0.35)]"
          onError={() => setHasPhoneArt(false)}
        />
      ) : (
        <div
          className="relative aspect-[9/19] w-full rounded-[2rem] border-[6px] border-ink bg-white shadow-[0_28px_48px_rgba(33,26,20,0.35)]"
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
    </motion.div>
  );
}

const HOW_STEPS = [
  {
    n: "01",
    tab: "Order",
    title: "You write the list",
    meta: "Free text · No catalogue",
    body: "Send ₦500 of pepper the way you’d tell a neighbour at the stall — not a supermarket SKU.",
    img: "/quika-hero-person.jpg",
    imgAlt: "Shopper ready with a market list",
    bg: "bg-brand-orange",
    fg: "text-white",
    soft: "text-white/75",
    mediaTint: "from-brand-orange/40",
    tagBg: "bg-ink text-white",
  },
  {
    n: "02",
    tab: "Assign",
    title: "We match an agent",
    meta: "Local · Market-fluent",
    body: "Accept a proposed agent who already knows that market’s stalls, prices, and shortcuts.",
    img: "/quika-hero-person.jpg",
    imgAlt: "Customer ready to assign a market agent",
    bg: "bg-ink",
    fg: "text-white",
    soft: "text-white/70",
    mediaTint: "from-ink/50",
    tagBg: "bg-brand-orange text-white",
  },
  {
    n: "03",
    tab: "Pay",
    title: "Deposit first",
    meta: "Wallet · Bank transfer",
    body: "Balance or transfer locks the run — shopping only starts when payment is clear.",
    img: "/quika-cat-produce.jpg",
    imgAlt: "Market produce ready for a paid run",
    bg: "bg-gold",
    fg: "text-ink",
    soft: "text-ink/70",
    mediaTint: "from-gold/50",
    tagBg: "bg-ink text-white",
  },
  {
    n: "04",
    tab: "Shop",
    title: "Bargain & transfer",
    meta: "In person · No cash float",
    body: "Your agent bargains at the stall and pays vendors by transfer — no unauthorized cash on the run.",
    img: "/quika-cat-produce.jpg",
    imgAlt: "Fresh produce from an open-air market",
    bg: "bg-brand-green",
    fg: "text-white",
    soft: "text-white/75",
    mediaTint: "from-brand-green/40",
    tagBg: "bg-ink text-white",
  },
  {
    n: "05",
    tab: "Pack",
    title: "Proof & final bill",
    meta: "Photos · Float recycle",
    body: "Photos, packing, and the final bill land in the app — float recycles through the system.",
    img: "/quika-trust-basket.jpg",
    imgAlt: "Market basket being packed",
    bg: "bg-chalk",
    fg: "text-ink",
    soft: "text-ink/65",
    mediaTint: "from-chalk/40",
    tagBg: "bg-brand-green text-white",
  },
  {
    n: "06",
    tab: "Deliver",
    title: "To your door",
    meta: "Courier · Confirm receipt",
    body: "A courier brings the haul home. The run ends when you confirm delivery.",
    img: "/quika-trust-basket.jpg",
    imgAlt: "Packed market basket ready for delivery",
    bg: "bg-brand-orange-dark",
    fg: "text-white",
    soft: "text-white/75",
    mediaTint: "from-brand-orange-dark/40",
    tagBg: "bg-ink text-white",
  },
] as const;

type HowStep = (typeof HOW_STEPS)[number];

const TAB_H = 40;
const STACK_TOP = 96;

/** Dropped-card settle poses — alternate L/R tilt + messy offsets (not a neat pile) */
const CARD_DROP = [
  { rotate: -5.5, x: -22, y: 0 },
  { rotate: 4.8, x: 26, y: 6 },
  { rotate: -6.2, x: -14, y: 4 },
  { rotate: 5.6, x: 20, y: 8 },
  { rotate: -4.4, x: -28, y: 5 },
  { rotate: 3.9, x: 16, y: 7 },
] as const;

/** Sticky stack — each card “drops” into a tilted, offset settle like a messy deck */
function HowFolder({
  step,
  index,
  progress,
  reduceMotion,
}: {
  step: HowStep;
  index: number;
  progress: MotionValue<number>;
  reduceMotion: boolean;
}) {
  const drop = CARD_DROP[index] ?? CARD_DROP[0];
  const stickyTop = STACK_TOP + index * TAB_H;
  const total = HOW_STEPS.length;
  // Upright while this card is the focus; settles into the messy drop as the next ones pile on
  const start = index / total;
  const end = Math.min(1, start + 0.42);
  const range: [number, number] = [start, end];

  const rawRotate = useTransform(progress, range, [0, drop.rotate]);
  const rawX = useTransform(progress, range, [0, drop.x]);
  const rawY = useTransform(progress, range, [0, drop.y]);
  const rawScale = useTransform(progress, range, [1, 0.97]);

  const rotate = useSpring(rawRotate, { stiffness: 70, damping: 22, mass: 0.4 });
  const x = useSpring(rawX, { stiffness: 70, damping: 22, mass: 0.4 });
  const y = useSpring(rawY, { stiffness: 70, damping: 22, mass: 0.4 });
  const scale = useSpring(rawScale, { stiffness: 70, damping: 22, mass: 0.4 });

  const settledStyle = reduceMotion
    ? {
        transform: `translate(${drop.x}px, ${drop.y}px) rotate(${drop.rotate}deg)`,
      }
    : undefined;

  return (
    <div
      className={reduceMotion ? "relative mb-8" : "sticky mb-8"}
      style={{ top: reduceMotion ? undefined : stickyTop, zIndex: index + 1 }}
    >
      <motion.article
        style={
          reduceMotion
            ? settledStyle
            : { rotate, x, y, scale, transformOrigin: "50% 20%" }
        }
        className={
          "will-change-transform overflow-hidden rounded-[1.75rem] shadow-[0_22px_50px_rgba(33,26,20,0.22)] sm:rounded-[2rem] " +
          step.bg +
          " " +
          step.fg
        }
      >
        <header
          className={
            "flex items-center gap-3 px-5 py-3.5 sm:gap-4 sm:px-8 " +
            (step.fg === "text-white" ? "border-b border-white/15" : "border-b border-ink/10")
          }
        >
          <span className="font-display text-xs font-bold tracking-[0.14em] opacity-70">
            {step.n}
          </span>
          <h3 className="font-display text-lg font-extrabold uppercase tracking-wide sm:text-xl">
            {step.tab}
          </h3>
          <span className="ml-auto hidden text-xs font-semibold uppercase tracking-[0.16em] opacity-60 sm:block">
            {step.meta}
          </span>
        </header>

        <div className="grid min-h-[min(62vh,540px)] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:px-14">
            <p className={"text-xs font-semibold uppercase tracking-[0.2em] " + step.soft}>
              {step.meta}
            </p>
            <h3 className="mt-3 max-w-md font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.6rem] lg:leading-[1.1]">
              {step.title}
            </h3>
            <p className={"mt-5 max-w-md text-base leading-relaxed sm:text-lg " + step.soft}>
              {step.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <span
                className={
                  "inline-flex h-9 items-center rounded-full px-3.5 text-xs font-bold uppercase tracking-wide " +
                  step.tagBg
                }
              >
                {step.tab}
              </span>
              <span
                className={
                  "inline-flex h-9 items-center rounded-full px-3.5 text-xs font-bold uppercase tracking-wide " +
                  step.tagBg
                }
              >
                Step {step.n}
              </span>
            </div>
          </div>

          <div className="relative min-h-[220px] sm:min-h-[300px] lg:min-h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={step.img}
              alt={step.imgAlt}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className={
                "absolute inset-0 bg-gradient-to-t via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent " +
                step.mediaTint
              }
            />
            <span
              className={
                "pointer-events-none absolute bottom-4 right-5 font-display text-[5.5rem] font-extrabold leading-none tracking-tight opacity-[0.18] sm:text-[7rem] " +
                step.fg
              }
              aria-hidden
            >
              {step.n}
            </span>
          </div>
        </div>
      </motion.article>
    </div>
  );
}

function HowStackCards() {
  const reduceMotion = Boolean(useReducedMotion());
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <div ref={containerRef} className="relative mt-12 overflow-visible px-2 sm:mt-16 sm:px-4 md:px-6">
      {HOW_STEPS.map((step, i) => (
        <HowFolder
          key={step.n}
          step={step}
          index={i}
          progress={scrollYProgress}
          reduceMotion={reduceMotion}
        />
      ))}
      {/* Hold so the pile can settle and peeks stay visible */}
      {!reduceMotion ? <div className="h-[40vh] sm:h-[48vh]" aria-hidden /> : null}
    </div>
  );
}

export default function MarketingPage() {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const scrollFromHash = (behavior: ScrollBehavior = "smooth") => {
      const fromStorage = sessionStorage.getItem("quika-scroll-to");
      if (fromStorage) {
        sessionStorage.removeItem("quika-scroll-to");
        // Wait a tick for layout after route transition
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
    <div className="bg-canvas text-ink">
      <MarketingHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-canvas">
        <SoftCircles tone="canvas" />
        <div className="relative z-[1] mx-auto grid max-w-6xl items-center gap-5 px-4 pb-10 pt-24 sm:px-6 lg:grid-cols-[0.85fr_1.35fr] lg:gap-0 lg:pb-14 lg:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative">
              <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]">
                Real{" "}
                <span className="text-brand-orange">Market</span>{" "}
                <span className="text-brand-green">Shopping</span>,
                <br />
                <span className="text-brand-orange">Made</span>{" "}
                <span className="text-brand-green">Easy</span>.
              </h1>
            </div>
            <motion.div
              className="mt-4 flex max-w-md items-center gap-3 sm:gap-4"
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
              className="mt-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <HeroCtas />
            </motion.div>
            <p className="mt-2 text-xs font-medium text-ink/40">
              Pre-pilot · Join the waitlist to start your first list
            </p>
          </motion.div>

          <motion.div
            className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 sm:max-w-none sm:flex-row sm:items-center sm:gap-5 lg:mx-0 lg:max-w-none lg:justify-start lg:gap-4"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Negative margin cancels the transparent padding around the circular disc */}
            <div className="w-full max-w-[360px] shrink-0 sm:max-w-[460px] lg:-ml-12 lg:max-w-[540px]">
              <HeroPortrait />
            </div>

            <Stagger className="flex min-w-0 flex-1 flex-col gap-5" stagger={0.14} delay={0.35}>
              <FeatureRow
                title="Free-text lists"
                body="Write ₦500 of pepper — no catalogue needed."
                icon={
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 6h12M8 12h12M8 18h8" strokeLinecap="round" />
                    <path d="M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" />
                  </svg>
                }
              />
              <FeatureRow
                title="Transfer pay"
                body="Agent bargains, then pays stalls by transfer."
                icon={
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17 17 7M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />
              <FeatureRow
                title="Courier delivery"
                body="Packed at the market and brought to your door."
                icon={
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7V10z" strokeLinejoin="round" />
                    <circle cx="7" cy="18" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="17" cy="18" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                }
              />
            </Stagger>
          </motion.div>
        </div>
      </section>

      {/* ORANGE APP — phone vertically centered on the right */}
      <section id="action" className="relative z-[2] scroll-mt-28 overflow-visible px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28">
        <Reveal className="relative z-[1] mx-auto max-w-6xl" y={36}>
          <div className="relative text-white">
            <div className="app-cta-slab relative z-0 bg-brand-orange px-7 py-12 sm:px-10 sm:py-14 lg:flex lg:min-h-[360px] lg:items-center lg:px-14 lg:py-16 lg:pr-[42%]">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
                  Live prototype
                </p>
                <h2 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                  Open the working{" "}
                  <span className="underline decoration-gold decoration-4 underline-offset-4">
                    Quika app
                  </span>
                </h2>
                <p className="mt-4 max-w-md text-base text-white/80 sm:text-lg">
                  The prototype is live — place lists, chat with your agent, and track packing to delivery.
                </p>
                <Stagger className="mt-8 flex flex-wrap gap-3" stagger={0.1} delay={0.1}>
                  <StaggerItem y={16} scale={0.94}>
                    <Link
                      href="/login"
                      className="inline-flex min-h-[48px] items-center rounded-full bg-white px-6 font-display text-sm font-bold text-brand-orange transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                    >
                      Open Quika
                    </Link>
                  </StaggerItem>
                  <StaggerItem y={16} scale={0.94}>
                    <Link
                      href="/markets"
                      className="inline-flex min-h-[48px] items-center rounded-full border-2 border-white/50 px-6 font-display text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                    >
                      Browse markets
                    </Link>
                  </StaggerItem>
                </Stagger>
              </div>
            </div>

            {/* Phone — right side, raised so it sits in the CTA band */}
            <Reveal
              y={48}
              scale={0.92}
              delay={0.12}
              className="relative z-10 mx-auto -mt-28 w-[220px] sm:-mt-36 sm:w-[250px] lg:absolute lg:right-2 lg:top-1/2 lg:mt-0 lg:w-[280px] lg:-translate-y-[62%] lg:translate-x-2"
            >
              <div className="origin-center rotate-[-6deg] sm:rotate-[-7deg]">
                <AppPhoneSlot className="w-full" />
              </div>
            </Reveal>
          </div>
        </Reveal>
      </section>

      {/* CATEGORIES — solid canvas so the trust wave join stays seamless */}
      <section id="categories" className="relative z-[1] scroll-mt-28 overflow-hidden bg-canvas px-4 py-20 sm:px-6">
        <div className="relative z-[1] mx-auto max-w-6xl text-center">
          <Reveal y={28}>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">Markets</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Our <span className="text-brand-orange">best shopped</span> categories.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-ink/55">
              Real market baskets — not supermarket aisles.
            </p>
          </Reveal>

          <Stagger className="mt-14 grid gap-10 sm:grid-cols-3" stagger={0.16}>
            {[
              { img: "/quika-cat-produce.jpg", title: "Fresh produce", ring: "text-brand-green", bg: "bg-brand-green/15" },
              { img: "/quika-cat-protein.jpg", title: "Proteins & fish", ring: "text-brand-orange", bg: "bg-brand-orange/15" },
              { img: "/quika-cat-pantry.jpg", title: "Pantry & provisions", ring: "text-gold", bg: "bg-gold/20" },
            ].map((c) => (
              <StaggerItem key={c.title} y={56} scale={0.88}>
                <Link href="/markets" className="group flex flex-col items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
                  <div className={"relative flex h-52 w-52 items-center justify-center rounded-full sm:h-56 sm:w-56 " + c.bg}>
                    <motion.div
                      className={"absolute inset-3 rounded-full dashed-ring " + c.ring}
                      animate={reduceMotion ? undefined : { rotate: 360 }}
                      transition={
                        reduceMotion
                          ? undefined
                          : { duration: 32, ease: "linear", repeat: Infinity }
                      }
                      aria-hidden
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.img} alt="" className="relative z-[1] h-40 w-40 rounded-full object-cover shadow-lg transition duration-300 group-hover:scale-105 sm:h-44 sm:w-44" />
                  </div>
                  <h3 className="mt-6 font-display text-xl font-bold text-ink">{c.title}</h3>
                  <span className="mt-2 text-sm font-bold text-brand-orange group-hover:underline">
                    Browse markets &gt;
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* DARK TRUST SECTION — wave from solid canvas (matches categories) */}
      <div className="relative overflow-hidden bg-ink">
        <Wave from="bg-canvas" to="bg-ink" />
        <FoodScatter tone="ink" />
        <SoftCircles tone="ink" />
        <section id="trust" className="relative z-[1] scroll-mt-28 text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr_0.9fr] lg:py-20">
            <Reveal x={-40} y={24}>
              <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                Trust that fits{" "}
                <span className="text-brand-orange">real markets</span>
              </h2>
              <p className="mt-4 text-white/65">
                Quika&apos;s differentiator isn&apos;t speed slogans — it&apos;s how money moves when there&apos;s no catalogue.
              </p>
              <Link
                href="/trust-and-safety"
                className="mt-5 inline-flex text-sm font-bold text-gold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                Read Trust &amp; Safety →
              </Link>
            </Reveal>

            <Reveal className="relative mx-auto w-full max-w-sm" y={48} scale={0.92} delay={0.08}>
              <Parallax offset={36}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/quika-trust-basket.jpg"
                  alt="Market basket of groceries"
                  className="w-full rounded-[2rem] object-cover shadow-2xl"
                />
              </Parallax>
            </Reveal>

            <Stagger className="space-y-6" stagger={0.12} delay={0.15}>
              {[
                { t: "Agent holds no cash", d: "Vendors paid by transfer only." },
                { t: "Transfer as receipt", d: "Every pay is photographed and logged." },
                { t: "Capped spending", d: "Hard ceilings — overages need your OK." },
                { t: "Deposit protection", d: "Commit before an agent is assigned." },
              ].map((f) => (
                <StaggerItem key={f.t} x={36} y={16} scale={0.96}>
                  <div className="flex gap-3">
                    <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange">
                      <BoltMark className="h-5 w-5 !bg-transparent" />
                    </span>
                    <div>
                      <p className="font-display font-bold">{f.t}</p>
                      <p className="text-sm text-white/55">{f.d}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
        <Wave from="bg-ink" to="bg-canvas" />
      </div>

      {/* HOW WE SERVE — sticky card stack */}
      <section id="how" className="relative z-[1] scroll-mt-28 overflow-x-clip bg-canvas px-4 py-20 sm:px-6 sm:py-28">
        <div className="relative z-[1] mx-auto max-w-6xl overflow-visible">
          <Reveal y={28} className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">The run</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
              How we <span className="text-brand-orange">serve</span> you.
            </h2>
            <p className="mt-4 text-base text-ink/60 sm:text-lg">
              Scroll the run — each step drops into the pile, tilted and offset like cards left as they land.
            </p>
          </Reveal>

          <HowStackCards />

          <Reveal y={24} delay={0.1} className="mt-6 flex flex-col items-start gap-4 border-t border-ink/10 pt-10 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-sm text-ink/55 sm:text-base">
              Ready for the first pilot market? Join the waitlist and we&apos;ll tell you when shopping opens.
            </p>
            <a
              href="#customers"
              onClick={handleInPageAnchor}
              className="inline-flex min-h-[48px] shrink-0 items-center rounded-full bg-brand-green px-6 font-display text-sm font-bold text-white transition hover:bg-brand-green/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Join the waitlist →
            </a>
          </Reveal>
        </div>
      </section>

      {/* PROMO / THREE DOORS */}
      <section id="doors" className="relative scroll-mt-28 overflow-hidden px-4 pb-4 sm:px-6">
        <Stagger className="relative z-[1] mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.2fr_0.8fr]" stagger={0.14}>
          <StaggerItem y={48} x={-24} scale={0.96}>
            <div id="customers" className="relative scroll-mt-28 overflow-hidden rounded-[1.75rem] bg-gold/90 p-8 sm:p-10">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/20" />
              <motion.span
                className="absolute right-6 top-6 rotate-12 rounded-full bg-brand-orange px-4 py-2 font-display text-sm font-bold text-white shadow-lg"
                initial={{ scale: 0.6, opacity: 0, rotate: 0 }}
                whileInView={{ scale: 1, opacity: 1, rotate: 12 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.25 }}
              >
                Waitlist
              </motion.span>
              <h3 className="max-w-sm font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
                Get the market haul without the market day.
              </h3>
              <p className="mt-3 max-w-md text-ink/70">
                Skip queues, haggling, and heavy bags. Join the waitlist for {PILOT}.
              </p>
              <div className="mt-6 max-w-md">
                <WaitlistInline inputId="waitlist-email-doors" />
              </div>
              <div className="mt-8 flex justify-end">
                <Parallax offset={20}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/quika-cat-produce.jpg" alt="" className="h-36 w-36 rounded-full object-cover shadow-xl sm:h-44 sm:w-44" />
                </Parallax>
              </div>
            </div>
          </StaggerItem>

          <Stagger className="flex flex-col gap-5" stagger={0.16} delay={0.08}>
            <StaggerItem y={36} x={28} scale={0.96}>
              <div id="agents" className="relative overflow-hidden rounded-[1.75rem] bg-ink p-6 text-white sm:p-7">
                <span className="absolute right-4 top-4 rounded-md bg-gold px-3 py-1 font-display text-xs font-bold text-ink">
                  Agents
                </span>
                <h3 className="max-w-[14rem] font-display text-2xl font-extrabold">
                  Earn shopping a market you already know.
                </h3>
                <p className="mt-2 text-sm text-white/60">No unauthorized cash — transfers + photos only.</p>
                <Link
                  href="/for-agents"
                  className="mt-5 inline-flex min-h-[44px] items-center rounded-lg bg-gold px-4 font-display text-sm font-bold text-ink transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  Apply as an agent →
                </Link>
              </div>
            </StaggerItem>

            <StaggerItem y={36} x={28} scale={0.96}>
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
            </StaggerItem>
          </Stagger>
        </Stagger>
      </section>

      {/* GREEN CLOSE — one solid green band; wave uses fill-brand-green */}
      <div className="relative mt-10 overflow-hidden bg-brand-green">
        <Wave from="bg-canvas" to="bg-brand-green" />
        <FoodScatter tone="green" />
        <SoftCircles tone="green" />
        <section id="start" className="relative z-[1] scroll-mt-28 px-4 py-16 text-white sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <Reveal x={-36} y={28}>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/65">Start here</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                Your list. Our agents.{" "}
                <span className="underline decoration-gold decoration-4 underline-offset-4">Your door.</span>
              </h2>
              <p className="mt-4 max-w-md text-base text-white/80 sm:text-lg">
                Free-text orders for open-air markets — bargain at the stalls, pay by transfer, courier home.
              </p>
              <Stagger className="mt-8 flex flex-wrap gap-3" stagger={0.1} delay={0.1}>
                <StaggerItem y={16} scale={0.94}>
                  <Link
                    href="/markets"
                    className="inline-flex min-h-[48px] items-center rounded-full bg-white px-6 font-display text-sm font-bold text-brand-green transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    Browse markets
                  </Link>
                </StaggerItem>
                <StaggerItem y={16} scale={0.94}>
                  <Link
                    href="/login"
                    className="inline-flex min-h-[48px] items-center rounded-full border-2 border-white/50 px-6 font-display text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    Open Quika
                  </Link>
                </StaggerItem>
              </Stagger>
            </Reveal>

            <Reveal y={48} scale={0.92} delay={0.12} className="relative mx-auto w-full max-w-md lg:max-w-none">
              <Parallax offset={40}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/quika-cat-produce.jpg"
                  alt="Fresh market produce"
                  className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
                />
              </Parallax>
            </Reveal>
          </div>
        </section>
        <Wave from="bg-brand-green" to="bg-ink" />
      </div>

      <div className="-mt-px">
        <MarketingFooter />
      </div>
    </div>
  );
}
