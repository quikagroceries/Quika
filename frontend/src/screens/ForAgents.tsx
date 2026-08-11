"use client";

import { FormEvent, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import { EASE, HeroIn, Reveal, Stagger, StaggerItem } from "@/components/marketing/motion";
import Wave from "@/components/marketing/Wave";
import { hashFromHref, scrollToSection } from "@/lib/scrollToSection";

function AgentApplyForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [market, setMarket] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent("Quika agent application");
    const body = encodeURIComponent(
      `Name: ${name}\nPhone: ${phone}\nMarket: ${market || "(not specified)"}\n`
    );
    window.location.href = `mailto:agents@quika.ng?subject=${subject}&body=${body}`;
    setSent(true);
  }

  if (sent) {
    return <p className="text-sm font-semibold text-brand-green">Opening your mail app…</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name"
        className="min-h-[48px] w-full rounded-xl border border-ink/10 bg-white px-4 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-brand-orange"
      />
      <input
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
        className="min-h-[48px] w-full rounded-xl border border-ink/10 bg-white px-4 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-brand-orange"
      />
      <input
        value={market}
        onChange={(e) => setMarket(e.target.value)}
        placeholder="Market you know best"
        className="min-h-[48px] w-full rounded-xl border border-ink/10 bg-white px-4 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-brand-orange"
      />
      <button
        type="submit"
        className="min-h-[48px] w-full rounded-xl bg-brand-orange font-display text-sm font-bold text-white transition hover:bg-brand-orange-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        Apply as an agent →
      </button>
    </form>
  );
}

const DAY = [
  {
    n: "01",
    title: "Accept a run",
    body: "A customer list lands for your market. You accept only what you can shop well.",
    accent: "text-brand-orange",
  },
  {
    n: "02",
    title: "Bargain the stalls",
    body: "Shop free-text items the way you already do — weight, freshness, fair price.",
    accent: "text-brand-green",
  },
  {
    n: "03",
    title: "Transfer & prove",
    body: "Pay vendors by transfer. Snap photo proof. No unauthorized cash in your pocket.",
    accent: "text-gold",
  },
  {
    n: "04",
    title: "Pack & hand off",
    body: "Final bill lands in the app. Courier takes the haul. You earn on completed runs.",
    accent: "text-white",
  },
];

const FIT = [
  { title: "You know the market", body: "Stalls, seasons, and who sells what — not a warehouse aisle." },
  { title: "You’re phone-fluent", body: "Transfers, photos, and chat while you move through the market." },
  { title: "You keep it clean", body: "No side cash. Proof on every spend. Customers trust the trail." },
];

export default function ForAgents() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();

  function goHomeHash(e: MouseEvent<HTMLAnchorElement>) {
    const hash = hashFromHref(e.currentTarget.getAttribute("href") || "");
    if (!hash) return;
    e.preventDefault();
    if (window.location.pathname === "/") {
      scrollToSection(hash);
      window.history.pushState(null, "", `/#${hash}`);
      return;
    }
    sessionStorage.setItem("quika-scroll-to", hash);
    router.push(`/#${hash}`);
  }

  return (
    <div className="bg-canvas text-ink">
      <MarketingHeader />

      {/* HERO — homepage pattern: canvas, ink type, side visual */}
      <section className="relative overflow-hidden bg-canvas">
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-20 lg:pt-20">
          <div>
            <HeroIn y={20} delay={0.05}>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">For Agents</p>
            </HeroIn>
            <HeroIn y={24} delay={0.12}>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Earn shopping a market{" "}
                <span className="text-brand-orange">you already know</span>.
              </h1>
            </HeroIn>
            <HeroIn y={20} delay={0.2}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/60 sm:text-lg">
                Customers send free-text lists. You bargain the stalls, pay by transfer, pack with
                proof — and get paid when the run is done.
              </p>
            </HeroIn>
            <Stagger className="mt-8 flex flex-wrap gap-3" stagger={0.1} delay={0.28} immediate>
              <StaggerItem y={14} scale={0.96}>
                <a
                  href="#apply"
                  className="inline-flex min-h-[48px] items-center rounded-full bg-brand-green px-6 text-sm font-bold text-white transition hover:bg-brand-green/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  Apply now
                </a>
              </StaggerItem>
              <StaggerItem y={14} scale={0.96}>
                <a
                  href="/#how"
                  onClick={goHomeHash}
                  className="inline-flex min-h-[48px] items-center rounded-full border-2 border-ink px-6 text-sm font-bold text-ink transition hover:bg-ink hover:text-white"
                >
                  See how orders work
                </a>
              </StaggerItem>
            </Stagger>
            <HeroIn y={12} delay={0.4}>
              <p className="mt-3 text-xs font-medium text-ink/40">Pre-pilot · Agent slots open with each market</p>
            </HeroIn>
          </div>

          <HeroIn y={36} delay={0.15} className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="overflow-hidden rounded-[2rem] shadow-[0_24px_50px_rgba(33,26,20,0.14)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/quika-hero-person.jpg"
                alt="Market agent with shopping"
                className="aspect-[4/5] w-full object-cover sm:aspect-square"
              />
            </div>
          </HeroIn>
        </div>
      </section>

      {/* WHY */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal y={24} className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">Why Quika</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your market knowledge is the product.
            </h2>
            <p className="mt-3 text-ink/60">
              We&apos;re not hiring warehouse pickers. We need people who already walk those aisles.
            </p>
          </Reveal>

          <Stagger className="mt-12 grid gap-10 sm:grid-cols-3" stagger={0.12}>
            {[
              {
                title: "Shop markets you know",
                body: "You're not learning a catalogue — you're bargaining stalls the way you already do.",
                color: "bg-brand-orange",
              },
              {
                title: "No unauthorized cash",
                body: "Transfers to vendors with photo proof. Float recycles; your earnings stay clean.",
                color: "bg-brand-green",
              },
              {
                title: "Earn on completed runs",
                body: "Accept proposed orders, shop the list, pack, and hand off to courier.",
                color: "bg-gold",
              },
            ].map((item) => (
              <StaggerItem key={item.title} y={36} scale={0.96}>
                <div className={"mb-4 h-1.5 w-12 " + item.color} />
                <h3 className="font-display text-xl font-bold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{item.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* DAY — ink band with waves (home trust pattern) */}
      <div className="relative bg-ink">
        <Wave from="bg-canvas" to="bg-ink" />
        <section className="px-4 py-16 text-white sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <Reveal y={24} className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-gold">The workday</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                A day on the run.
              </h2>
            </Reveal>

            <Stagger className="mt-12 grid gap-0 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
              {DAY.map((step, i) => (
                <StaggerItem key={step.n} y={40} scale={0.96}>
                  <div
                    className={
                      "relative h-full border-white/10 px-1 py-6 sm:px-5 " +
                      (i < DAY.length - 1 ? "sm:border-r" : "")
                    }
                  >
                    <motion.span
                      className={"font-display text-5xl font-extrabold " + step.accent}
                      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
                    >
                      {step.n}
                    </motion.span>
                    <h3 className="mt-4 font-display text-lg font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{step.body}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
        <Wave from="bg-ink" to="bg-canvas" />
      </div>

      {/* WHO FITS */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <Reveal y={36} scale={0.96} className="relative overflow-hidden rounded-[1.75rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/quika-cat-produce.jpg"
              alt="Open-air market produce"
              className="aspect-[4/5] w-full object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
            <p className="absolute bottom-6 left-6 right-6 font-display text-xl font-bold text-white sm:text-2xl">
              Your shortcuts are the edge.
            </p>
          </Reveal>

          <div>
            <Reveal y={24}>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">Who thrives</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Built for people who already belong in the market.
              </h2>
            </Reveal>
            <Stagger className="mt-10 space-y-8" stagger={0.12}>
              {FIT.map((item, i) => (
                <StaggerItem key={item.title} x={24} y={0} scale={0.98}>
                  <div className="flex gap-5">
                    <span className="font-display text-2xl font-extrabold text-brand-orange/40">
                      0{i + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-bold">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink/60">{item.body}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* APPLY — green band like home closer */}
      <div className="relative bg-brand-green">
        <Wave from="bg-canvas" to="bg-brand-green" />
        <section id="apply" className="scroll-mt-28 px-4 py-16 text-white sm:px-6 sm:py-20">
          <Reveal
            y={32}
            className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center"
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gold">Apply</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Ready to shop for Quika?
              </h2>
              <p className="mt-3 max-w-md text-white/75">
                Tell us who you are and which market you know. We&apos;ll reach out as pilot slots open.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-white/80">
                <li className="flex gap-2">
                  <span className="text-gold">→</span> Transfers + photo proof only
                </li>
                <li className="flex gap-2">
                  <span className="text-gold">→</span> You accept proposed orders from your market
                </li>
                <li className="flex gap-2">
                  <span className="text-gold">→</span> Earnings tracked on completed runs
                </li>
              </ul>
            </div>
            <div className="rounded-[1.5rem] bg-canvas p-6 text-ink sm:p-8">
              <h3 className="font-display text-lg font-bold">Agent application</h3>
              <p className="mt-1 text-sm text-ink/50">Opens your mail app to agents@quika.ng</p>
              <div className="mt-5">
                <AgentApplyForm />
              </div>
            </div>
          </Reveal>
        </section>
        <Wave from="bg-brand-green" to="bg-ink" />
      </div>

      <MarketingFooter />
    </div>
  );
}
