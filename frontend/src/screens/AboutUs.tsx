"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent } from "react";
import AnnouncementBar from "@/components/marketing/AnnouncementBar";
import HelpWidget from "@/components/marketing/HelpWidget";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import { HeroIn, Reveal, Stagger, StaggerItem, ClipReveal } from "@/components/marketing/motion";
import SplitReveal from "@/components/marketing/SplitReveal";
import StickyCta from "@/components/marketing/StickyCta";
import { hashFromHref, scrollToSection } from "@/lib/scrollToSection";

const BELIEFS = [
  {
    title: "Markets first",
    body: "Balogun-style bargaining and transfer pay — not a catalogue dressed up as “local.”",
    bar: "bg-brand-orange",
  },
  {
    title: "Groceries, broadly",
    body: "Open-air produce or supermarket staples — one list, one run, whichever venue actually has it.",
    bar: "bg-brand-green",
  },
  {
    title: "People in the loop",
    body: "Human agents shop your list. Photos and transfers keep every run accountable, not an algorithm's guess.",
    bar: "bg-gold",
  },
  {
    title: "Pre-pilot honesty",
    body: "We're opening carefully. Waitlist for customers, applications for agents and riders, live app when you have access.",
    bar: "bg-brand-orange-dark",
  },
];

const COMPARISON = [
  { old: "Go yourself, or send someone and hope", qyka: "Send a free-text list, an agent shops it" },
  { old: "Cash changes hands with no record", qyka: "Every vendor paid by transfer, photographed" },
  { old: "A supermarket app that skips the market entirely", qyka: "One list covers market stalls and supermarket shelves" },
  { old: "No idea what's happening until it arrives", qyka: "Status, photos, and chat with your agent the whole run" },
] as const;

const STORY = [
  {
    label: "The gap",
    title: "Catalogues don't fit open-air markets",
    body: "Prices shift by the hour. Items are sold by heap, not SKU. Apps that pretend otherwise break the moment you ask for “₦500 of pepper.”",
  },
  {
    label: "The bet",
    title: "Put a person who knows the stalls in the middle",
    body: "Qyka pairs free-text lists with agents who already bargain those markets — then wraps the run in transfers, photos, and delivery home.",
  },
  {
    label: "Where we are",
    title: "Building toward the first pilot",
    body: "We're lining up markets, agents, and the money trail before we open the floodgates. Join early if that sounds like home.",
  },
];

export default function AboutUs() {
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
    sessionStorage.setItem("qyka-scroll-to", hash);
    router.push(`/#${hash}`);
  }

  return (
    <div className="force-light min-h-screen bg-canvas text-ink">
      <AnnouncementBar />
      <MarketingHeader />

      {/* HERO — homepage pattern */}
      <section className="relative overflow-hidden bg-canvas">
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-20 lg:pt-20">
          <div>
            <HeroIn y={20} delay={0.05}>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">About Us</p>
            </HeroIn>
            <SplitReveal
              as="h1"
              mode="load"
              delay={0.12}
              className="mt-3 font-serif text-5xl italic leading-[1.05] tracking-tight sm:text-6xl lg:text-[3.75rem]"
            >
              Real <span className="text-brand-orange">groceries</span>, built the way Nigerian
              shopping <span className="text-brand-green">actually works</span>.
            </SplitReveal>
            <HeroIn y={20} delay={0.2}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/60 sm:text-lg">
                A remote personal shopper for groceries — open-air markets and supermarkets alike.
                Free-text lists, stall-smart agents, transfer pay, and a rider to your door.
              </p>
            </HeroIn>
            <Stagger className="mt-8 flex flex-wrap gap-3" stagger={0.1} delay={0.28} immediate>
              <StaggerItem y={14} scale={0.96}>
                <a
                  href="/#customers"
                  onClick={goHomeHash}
                  className="inline-flex min-h-[48px] items-center rounded-full bg-brand-orange px-6 text-sm font-bold text-[#1A1A1A] transition hover:bg-brand-orange-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  Join the waitlist
                </a>
              </StaggerItem>
              <StaggerItem y={14} scale={0.96}>
                <Link
                  href="/for-agents"
                  className="inline-flex min-h-[48px] items-center rounded-full border-2 border-ink px-6 text-sm font-bold text-ink transition hover:bg-ink hover:text-white"
                >
                  For Agents
                </Link>
              </StaggerItem>
            </Stagger>
            <HeroIn y={12} delay={0.4}>
              <p className="mt-3 text-xs font-medium text-ink/40">Pre-pilot · Opening carefully</p>
            </HeroIn>
          </div>

          <HeroIn y={36} delay={0.15} className="relative mx-auto w-full max-w-md lg:max-w-none">
            <ClipReveal delay={0.3} className="overflow-hidden rounded-[2rem] shadow-[0_24px_50px_rgba(33,26,20,0.14)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/qyka-cat-produce.jpg"
                alt="Open-air market produce"
                className="aspect-[4/5] w-full object-cover sm:aspect-square"
              />
            </ClipReveal>
          </HeroIn>
        </div>
      </section>

      {/* MISSION */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <Reveal y={28} className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">Mission</p>
          <SplitReveal as="h2" className="mt-3 font-serif text-4xl italic leading-snug tracking-tight sm:text-5xl">
            Bring real groceries to your kitchen —{" "}
            <span className="text-brand-orange">without faking the market</span>.
          </SplitReveal>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">
            No pretend catalogue where one doesn't belong. No unauthorized cash. Just people who
            know the stalls and the shelves, money that leaves a trail, and groceries that arrive
            the way you asked for them.
          </p>
        </Reveal>
      </section>


      {/* STORY — white band. No dark surfaces anywhere in this palette. */}
      <div className="relative bg-surface">
        <section className="px-4 py-16 text-ink sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <Reveal y={24}>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange-dark">Why we exist</p>
              <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight sm:text-5xl">
                The story in three beats.
              </SplitReveal>
            </Reveal>

            <Stagger className="mt-12 space-y-10" stagger={0.14}>
              {STORY.map((beat, i) => (
                <StaggerItem key={beat.label} y={36} scale={0.98}>
                  <div className="grid gap-4 border-t border-ink/10 pt-10 lg:grid-cols-[10rem_1fr] lg:gap-10">
                    <div>
                      <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">
                        {beat.label}
                      </span>
                      <p className="mt-2 font-display text-4xl font-extrabold text-ink/10">
                        0{i + 1}
                      </p>
                    </div>
                    <div className="max-w-2xl">
                      <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                        {beat.title}
                      </h3>
                      <p className="mt-3 text-base leading-relaxed text-ink/65">{beat.body}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      </div>

      {/* BELIEFS */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal y={24} className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">
              What we believe
            </p>
            <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight sm:text-5xl">
              How we decide what to build.
            </SplitReveal>
          </Reveal>

          <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
            {BELIEFS.map((item) => (
              <StaggerItem key={item.title} y={32} scale={0.96}>
                <div className="transition hover:-translate-y-1 hover:shadow-card">
                  <div className="h-full rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(33,26,20,0.06)] ring-1 ring-ink/5">
                    <div className={"mb-5 h-1.5 w-14 " + item.bar} />
                    <h3 className="font-display text-lg font-extrabold text-ink">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink/60">{item.body}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>


      {/* COMPARISON — the old way vs Qyka, concrete not abstract */}
      <section className="bg-canvas-deep/60 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <Reveal y={24} className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">The difference</p>
            <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight sm:text-5xl">
              What actually changes.
            </SplitReveal>
          </Reveal>

          <Reveal y={28} delay={0.08} className="mt-10 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(33,26,20,0.06)] ring-1 ring-ink/5">
            <div className="grid grid-cols-2 border-b border-ink/8 bg-canvas">
              <p className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink/45 sm:px-6">The old way</p>
              <p className="border-l border-ink/8 px-5 py-3 text-xs font-bold uppercase tracking-wide text-brand-green sm:px-6">
                The Qyka way
              </p>
            </div>
            {COMPARISON.map((row) => (
              <div key={row.old} className="grid grid-cols-2 border-b border-ink/6 last:border-0">
                <p className="px-5 py-4 text-sm leading-relaxed text-ink/50 sm:px-6">{row.old}</p>
                <p className="border-l border-ink/6 px-5 py-4 text-sm font-semibold leading-relaxed text-ink sm:px-6">
                  {row.qyka}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>


      {/* CTA — white closer. No dark surfaces anywhere in this palette;
          separation from the cream page comes from bg-surface. */}
      <div className="relative bg-surface">
        <section className="px-4 py-16 text-ink sm:px-6 sm:py-20">
          <Reveal
            y={28}
            className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]"
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange-dark">Join in</p>
              <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight sm:text-5xl">
                Come along for the pilot.
              </SplitReveal>
              <p className="mt-3 max-w-md text-ink/70">
                Join the waitlist as a customer, apply as an agent or rider, or open the live app
                if you already have access.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/#customers"
                  onClick={goHomeHash}
                  className="inline-flex min-h-[48px] items-center rounded-full bg-brand-orange px-6 text-sm font-bold text-[#1A1A1A] transition hover:bg-brand-orange-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  Join the waitlist
                </a>
                <Link
                  href="/for-agents"
                  className="inline-flex min-h-[48px] items-center rounded-full border-2 border-ink/15 px-6 text-sm font-bold text-ink transition hover:bg-ink/5"
                >
                  Agent
                </Link>
                <Link
                  href="/for-riders"
                  className="inline-flex min-h-[48px] items-center rounded-full border-2 border-ink/15 px-6 text-sm font-bold text-ink transition hover:bg-ink/5"
                >
                  Rider
                </Link>
              </div>
            </div>
            <ClipReveal direction="right" className="overflow-hidden rounded-[1.75rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/qyka-trust-basket.jpg"
                alt="Market basket"
                className="aspect-[4/3] w-full object-cover"
              />
            </ClipReveal>
          </Reveal>
        </section>
      </div>

      <MarketingFooter />
      <HelpWidget />
      <StickyCta label="Join the waitlist" href="/#customers" />
    </div>
  );
}
