"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent } from "react";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import { HeroIn, Reveal, Stagger, StaggerItem } from "@/components/marketing/motion";
import Wave from "@/components/marketing/Wave";
import { hashFromHref, scrollToSection } from "@/lib/scrollToSection";

const BELIEFS = [
  {
    title: "Markets first",
    body: "Balogun-style bargaining and transfer pay — not supermarket shelves dressed up as “local.”",
    bar: "bg-brand-orange",
  },
  {
    title: "People in the loop",
    body: "Human agents shop your list. Photos and transfers keep every run accountable.",
    bar: "bg-brand-green",
  },
  {
    title: "Pre-pilot honesty",
    body: "We're opening carefully. Waitlist for customers, applications for agents, live app when you have access.",
    bar: "bg-gold",
  },
];

const STORY = [
  {
    label: "The gap",
    title: "Catalogues don't fit open-air markets",
    body: "Prices shift by the hour. Items are sold by heap, not SKU. Apps that pretend otherwise break the moment you ask for “₦500 of pepper.”",
  },
  {
    label: "The bet",
    title: "Put a person who knows the stalls in the middle",
    body: "Quika pairs free-text lists with agents who already bargain those markets — then wraps the run in transfers, photos, and delivery home.",
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
    sessionStorage.setItem("quika-scroll-to", hash);
    router.push(`/#${hash}`);
  }

  return (
    <div className="bg-canvas text-ink">
      <MarketingHeader />

      {/* HERO — homepage pattern */}
      <section className="relative overflow-hidden bg-canvas">
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-20 lg:pt-20">
          <div>
            <HeroIn y={20} delay={0.05}>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">About Us</p>
            </HeroIn>
            <HeroIn y={24} delay={0.12}>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Real{" "}
                <span className="text-brand-orange">market</span> shopping, built the way markets{" "}
                <span className="text-brand-green">actually work</span>.
              </h1>
            </HeroIn>
            <HeroIn y={20} delay={0.2}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/60 sm:text-lg">
                A remote personal shopper for Nigerian open-air markets — free-text lists, stall-smart
                agents, transfer pay, and a courier to your door.
              </p>
            </HeroIn>
            <Stagger className="mt-8 flex flex-wrap gap-3" stagger={0.1} delay={0.28} immediate>
              <StaggerItem y={14} scale={0.96}>
                <a
                  href="/#customers"
                  onClick={goHomeHash}
                  className="inline-flex min-h-[48px] items-center rounded-full bg-brand-green px-6 text-sm font-bold text-white transition hover:bg-brand-green/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
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
            <div className="overflow-hidden rounded-[2rem] shadow-[0_24px_50px_rgba(33,26,20,0.14)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/quika-cat-produce.jpg"
                alt="Open-air market produce"
                className="aspect-[4/5] w-full object-cover sm:aspect-square"
              />
            </div>
          </HeroIn>
        </div>
      </section>

      {/* MISSION */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <Reveal y={28} className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">Mission</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold leading-snug tracking-tight sm:text-4xl">
            Bring the open-air market to your kitchen —{" "}
            <span className="text-brand-orange">without faking the market</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">
            No pretend catalogue. No unauthorized cash. Just people who know the stalls, money that
            leaves a trail, and food that arrives the way you asked for it.
          </p>
        </Reveal>
      </section>

      {/* STORY — ink + waves */}
      <div className="relative bg-ink">
        <Wave from="bg-canvas" to="bg-ink" />
        <section className="px-4 py-16 text-white sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <Reveal y={24}>
              <p className="text-sm font-semibold uppercase tracking-wide text-gold">Why we exist</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                The story in three beats.
              </h2>
            </Reveal>

            <Stagger className="mt-12 space-y-10" stagger={0.14}>
              {STORY.map((beat, i) => (
                <StaggerItem key={beat.label} y={36} scale={0.98}>
                  <div className="grid gap-4 border-t border-white/15 pt-10 lg:grid-cols-[10rem_1fr] lg:gap-10">
                    <div>
                      <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">
                        {beat.label}
                      </span>
                      <p className="mt-2 font-display text-4xl font-extrabold text-white/15">
                        0{i + 1}
                      </p>
                    </div>
                    <div className="max-w-2xl">
                      <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                        {beat.title}
                      </h3>
                      <p className="mt-3 text-base leading-relaxed text-white/65">{beat.body}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
        <Wave from="bg-ink" to="bg-canvas" />
      </div>

      {/* BELIEFS */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal y={24} className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">
              What we believe
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              How we decide what to build.
            </h2>
          </Reveal>

          <Stagger className="mt-12 grid gap-10 sm:grid-cols-3" stagger={0.12}>
            {BELIEFS.map((item) => (
              <StaggerItem key={item.title} y={36} scale={0.96}>
                <div className={"mb-5 h-1.5 w-14 " + item.bar} />
                <h3 className="font-display text-xl font-bold text-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/60">{item.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA — green closer with waves into footer */}
      <div className="relative bg-brand-green">
        <Wave from="bg-canvas" to="bg-brand-green" />
        <section className="px-4 py-16 text-white sm:px-6 sm:py-20">
          <Reveal
            y={28}
            className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]"
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gold">Join in</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Come along for the pilot.
              </h2>
              <p className="mt-3 max-w-md text-white/75">
                Join the waitlist as a customer, apply as an agent, or open the live app if you already have access.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/#customers"
                  onClick={goHomeHash}
                  className="inline-flex min-h-[48px] items-center rounded-full bg-white px-6 text-sm font-bold text-brand-green transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  Join the waitlist
                </a>
                <Link
                  href="/for-agents"
                  className="inline-flex min-h-[48px] items-center rounded-full border-2 border-white/50 px-6 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  For Agents
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-[1.75rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/quika-trust-basket.jpg"
                alt="Market basket"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </Reveal>
        </section>
        <Wave from="bg-brand-green" to="bg-ink" />
      </div>

      <MarketingFooter />
    </div>
  );
}
