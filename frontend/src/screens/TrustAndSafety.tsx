"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import { EASE, HeroIn, Reveal, Stagger, StaggerItem } from "@/components/marketing/motion";
import Wave from "@/components/marketing/Wave";

const TRAIL = [
  {
    n: "01",
    title: "List",
    body: "Free-text order — what you actually want from the market, not SKUs.",
    accent: "text-brand-orange",
  },
  {
    n: "02",
    title: "Deposit",
    body: "Wallet or transfer locks the run before anyone shops.",
    accent: "text-gold",
  },
  {
    n: "03",
    title: "Transfers",
    body: "Agents pay stalls by bank transfer — every spend leaves a trail.",
    accent: "text-brand-green",
  },
  {
    n: "04",
    title: "Photos",
    body: "Purchases and packing documented before the haul leaves the market.",
    accent: "text-brand-orange",
  },
  {
    n: "05",
    title: "Confirm",
    body: "The run ends when you confirm delivery — or raise an issue on the trail.",
    accent: "text-gold",
  },
];

const PILLARS = [
  {
    title: "Transfer pay, not pocket cash",
    body: "Agents pay stalls by bank transfer. No unauthorized cash handling — every spend leaves a trail you can follow.",
    img: "/quika-cat-produce.jpg",
  },
  {
    title: "Photo proof on the run",
    body: "Purchases and packing are documented so you can see what left the market before it reaches your door.",
    img: "/quika-trust-basket.jpg",
  },
  {
    title: "Deposit or balance first",
    body: "Orders move when payment is clear. Float recycles through the system instead of sitting in someone's pocket.",
    img: "/quika-hero-person.jpg",
  },
  {
    title: "You confirm delivery",
    body: "The run isn't done until you confirm. Issues can be raised against the order trail — list, transfers, and photos.",
    img: "/quika-cat-protein.jpg",
  },
];

export default function TrustAndSafety() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="bg-canvas text-ink">
      <MarketingHeader />

      {/* HERO — canvas + ink type like home */}
      <section className="relative overflow-hidden bg-canvas">
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:pb-20 lg:pt-20">
          <div>
            <HeroIn y={20} delay={0.05}>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">
                Trust &amp; Safety
              </p>
            </HeroIn>
            <HeroIn y={24} delay={0.12}>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Built for how money moves when there&apos;s{" "}
                <span className="text-brand-orange">no catalogue</span>.
              </h1>
            </HeroIn>
            <HeroIn y={20} delay={0.2}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/60 sm:text-lg">
                Quika&apos;s differentiator isn&apos;t speed slogans — it&apos;s accountability on
                free-text market runs: transfers, photos, and a clear path from list to door.
              </p>
            </HeroIn>
            <Stagger className="mt-8 flex flex-wrap gap-3" stagger={0.1} delay={0.28} immediate>
              <StaggerItem y={14} scale={0.96}>
                <Link
                  href="/shop"
                  className="inline-flex min-h-[48px] items-center rounded-full bg-brand-green px-6 text-sm font-bold text-white transition hover:bg-brand-green/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  Open Quika
                </Link>
              </StaggerItem>
              <StaggerItem y={14} scale={0.96}>
                <a
                  href="mailto:hello@quika.ng?subject=Trust%20%26%20Safety"
                  className="inline-flex min-h-[48px] items-center rounded-full border-2 border-ink px-6 text-sm font-bold text-ink transition hover:bg-ink hover:text-white"
                >
                  Contact support
                </a>
              </StaggerItem>
            </Stagger>
          </div>

          <HeroIn y={36} delay={0.15} className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="overflow-hidden rounded-[2rem] shadow-[0_24px_50px_rgba(33,26,20,0.14)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/quika-trust-basket.jpg"
                alt="Market basket ready for delivery"
                className="aspect-[4/5] w-full object-cover sm:aspect-square"
              />
            </div>
          </HeroIn>
        </div>
      </section>

      {/* TRAIL — ink band with waves */}
      <div className="relative bg-ink">
        <Wave from="bg-canvas" to="bg-ink" />
        <section className="px-4 py-16 text-white sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <Reveal y={24} className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-gold">The trail</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Every run leaves a paper trail — without the paper.
              </h2>
              <p className="mt-3 text-white/60">
                From the moment you send a list to the moment you confirm delivery, money and proof stay linked.
              </p>
            </Reveal>

            <Stagger className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5" stagger={0.08}>
              {TRAIL.map((step, i) => (
                <StaggerItem key={step.n} y={32} scale={0.96}>
                  <motion.span
                    className={"font-display text-4xl font-extrabold " + step.accent}
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55, delay: i * 0.06, ease: EASE }}
                  >
                    {step.n}
                  </motion.span>
                  <h3 className="mt-3 font-display text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{step.body}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
        <Wave from="bg-ink" to="bg-canvas" />
      </div>

      {/* PILLARS */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl space-y-16 sm:space-y-20">
          <Reveal y={24} className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">Pillars</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              How trust shows up on a real market run.
            </h2>
          </Reveal>

          {PILLARS.map((item, i) => {
            const flip = i % 2 === 1;
            return (
              <div key={item.title} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <Reveal y={40} scale={0.96} className={flip ? "lg:order-2" : ""}>
                  <div className="relative overflow-hidden rounded-[1.75rem]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.img} alt="" className="aspect-[16/11] w-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-ink/40 to-transparent" />
                    <span className="absolute bottom-4 left-5 font-display text-5xl font-extrabold text-white/30">
                      0{i + 1}
                    </span>
                  </div>
                </Reveal>
                <Reveal y={28} delay={0.08} className={flip ? "lg:order-1" : ""}>
                  <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">
                    Pillar 0{i + 1}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {item.title}
                  </h3>
                  <p className="mt-4 max-w-md text-base leading-relaxed text-ink/65">{item.body}</p>
                </Reveal>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA — orange panel rhythm like home app CTA, simpler shape */}
      <section className="px-4 pb-4 sm:px-6">
        <Reveal
          y={32}
          className="mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-[2rem] bg-brand-orange px-6 py-10 text-white sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-12"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Support</p>
            <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
              Questions about a live order?
            </h2>
            <p className="mt-3 max-w-md text-white/80">
              Open Quika to chat with your agent, review photos, and track packing through delivery.
              For partnership or pilot questions, email us directly.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex min-h-[48px] items-center rounded-full bg-white px-6 text-sm font-bold text-brand-orange transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                Open Quika
              </Link>
              <a
                href="mailto:hello@quika.ng?subject=Trust%20%26%20Safety"
                className="inline-flex min-h-[48px] items-center rounded-full border-2 border-white/50 px-6 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Contact support
              </a>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/quika-trust-basket.jpg"
            alt="Market basket packed for delivery"
            className="mx-auto aspect-[4/3] w-full max-w-md rounded-[1.25rem] object-cover lg:max-w-none"
          />
        </Reveal>
      </section>

      <div className="relative mt-10 bg-ink">
        <Wave from="bg-canvas" to="bg-ink" />
        <MarketingFooter />
      </div>
    </div>
  );
}
