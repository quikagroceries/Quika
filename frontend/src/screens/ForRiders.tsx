"use client";

import { FormEvent, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import ClipReveal from "@/components/marketing/ClipReveal";
import HelpWidget from "@/components/marketing/HelpWidget";
import ImagePlaceholder from "@/components/marketing/ImagePlaceholder";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import { EASE, HeroIn, Reveal, Stagger, StaggerItem } from "@/components/marketing/motion";
import SplitReveal from "@/components/marketing/SplitReveal";
import { hashFromHref, scrollToSection } from "@/lib/scrollToSection";

function RiderApplyForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent("Qyka rider application");
    const body = encodeURIComponent(
      `Name: ${name}\nPhone: ${phone}\nArea / market you'd cover: ${area || "(not specified)"}\nVehicle: ${vehicle || "(not specified)"}\n`
    );
    window.location.href = `mailto:riders@quika.ng?subject=${subject}&body=${body}`;
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
        value={area}
        onChange={(e) => setArea(e.target.value)}
        placeholder="Area or market you'd cover"
        className="min-h-[48px] w-full rounded-xl border border-ink/10 bg-white px-4 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-brand-orange"
      />
      <input
        value={vehicle}
        onChange={(e) => setVehicle(e.target.value)}
        placeholder="Vehicle (bike, keke, car…)"
        className="min-h-[48px] w-full rounded-xl border border-ink/10 bg-white px-4 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-brand-orange"
      />
      <button
        type="submit"
        className="min-h-[48px] w-full rounded-xl bg-brand-orange font-display text-sm font-bold text-[#1A1A1A] transition hover:bg-brand-orange-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        Apply as a rider →
      </button>
    </form>
  );
}

const RUN = [
  {
    n: "01",
    title: "Accept a delivery",
    body: "A packed order needs a ride from a market gate to a customer's door. You accept what fits your route.",
    accent: "text-brand-orange",
  },
  {
    n: "02",
    title: "Pick up at the gate",
    body: "Collect the sealed order from the agent — already packed and photographed before it's in your hands.",
    accent: "text-brand-green",
  },
  {
    n: "03",
    title: "Ride it home",
    body: "Straight to the delivery address. The app has the drop-off and the customer's contact if you need it.",
    accent: "text-brand-orange-dark",
  },
  {
    n: "04",
    title: "Confirm & earn",
    body: "Customer confirms receipt, the run closes, and your earnings land for that completed delivery.",
    accent: "text-ink",
  },
];

const FIT = [
  { title: "You know the routes", body: "Market exits, traffic patterns, and the fastest way to a doorstep." },
  { title: "You have your own ride", body: "Bike, keke, or car — whatever gets a packed order there intact." },
  { title: "You're phone-fluent", body: "Confirming pickups, following drop-off details, and chatting if plans change." },
];

export default function ForRiders() {
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
    sessionStorage.setItem("qyka-scroll-to", hash);
    router.push(`/#${hash}`);
  }

  return (
    <div className="force-light min-h-screen bg-canvas text-ink">
      <MarketingHeader />

      {/* HERO — homepage pattern: canvas, ink type, side visual */}
      <section className="relative overflow-hidden bg-canvas">
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-20 lg:pt-20">
          <div>
            <HeroIn y={20} delay={0.05}>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">For Riders</p>
            </HeroIn>
            <SplitReveal
              as="h1"
              mode="load"
              delay={0.12}
              className="mt-3 font-serif text-5xl italic leading-[1.05] tracking-tight sm:text-6xl lg:text-[3.75rem]"
            >
              Deliver market hauls, <span className="text-brand-orange">earn on your schedule</span>.
            </SplitReveal>
            <HeroIn y={20} delay={0.2}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/60 sm:text-lg">
                Agents pack the order at the market gate. You ride it to the customer&apos;s door
                and get paid when the delivery is confirmed.
              </p>
            </HeroIn>
            <Stagger className="mt-8 flex flex-wrap gap-3" stagger={0.1} delay={0.28} immediate>
              <StaggerItem y={14} scale={0.96}>
                <a
                  href="#apply"
                  className="inline-flex min-h-[48px] items-center rounded-full bg-brand-orange px-6 text-sm font-bold text-[#1A1A1A] transition hover:bg-brand-orange-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  Apply now
                </a>
              </StaggerItem>
              <StaggerItem y={14} scale={0.96}>
                <a
                  href="/#help"
                  onClick={goHomeHash}
                  className="inline-flex min-h-[48px] items-center rounded-full border-2 border-ink px-6 text-sm font-bold text-ink transition hover:bg-ink hover:text-white"
                >
                  See how orders work
                </a>
              </StaggerItem>
            </Stagger>
            <HeroIn y={12} delay={0.4}>
              <p className="mt-3 text-xs font-medium text-ink/40">Pre-pilot · Rider slots open with each market</p>
            </HeroIn>
          </div>

          <HeroIn y={36} delay={0.15} className="relative mx-auto w-full max-w-md lg:max-w-none">
            <ClipReveal delay={0.3} className="overflow-hidden rounded-[2rem] shadow-[0_24px_50px_rgba(33,26,20,0.14)]">
              <ImagePlaceholder
                label="Rider on a delivery bike with packed market bags"
                file="/qyka-rider-hero.jpg"
                className="aspect-[4/5] w-full sm:aspect-square"
              />
            </ClipReveal>
          </HeroIn>
        </div>
      </section>

      {/* WHY */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal y={24} className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">Why ride for Qyka</p>
            <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight sm:text-5xl">
              Short, local runs — not cross-town logistics.
            </SplitReveal>
            <p className="mt-3 text-ink/60">
              One pickup, one drop-off, per run. You know the area better than any route planner.
            </p>
          </Reveal>

          <Stagger className="mt-12 grid gap-10 sm:grid-cols-3" stagger={0.12}>
            {[
              {
                title: "Flexible hours",
                body: "Come online when it suits you. Accept the deliveries that fit your route.",
                color: "bg-brand-orange",
              },
              {
                title: "Paid per delivery",
                body: "Earnings are tied to completed runs — confirmed by the customer, tracked in the app.",
                color: "bg-brand-green",
              },
              {
                title: "Already packed & proven",
                body: "Orders arrive to you sealed and photographed. You're moving it, not assembling it.",
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


      {/* RUN — white band. No dark surfaces anywhere in this palette. */}
      <div className="relative bg-surface">
        <section className="px-4 py-16 text-ink sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <Reveal y={24} className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange-dark">The delivery</p>
              <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight sm:text-5xl">
                One run, start to finish.
              </SplitReveal>
            </Reveal>

            <Stagger className="mt-12 grid gap-0 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
              {RUN.map((step, i) => (
                <StaggerItem key={step.n} y={40} scale={0.96}>
                  <div
                    className={
                      "relative h-full border-ink/10 px-1 py-6 sm:px-5 " +
                      (i < RUN.length - 1 ? "sm:border-r" : "")
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
                    <p className="mt-2 text-sm leading-relaxed text-ink/60">{step.body}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      </div>

      {/* WHO FITS */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <Reveal y={36} scale={0.96} className="relative overflow-hidden rounded-[1.75rem]">
            <ClipReveal direction="left">
              <ImagePlaceholder
                label="Rider handing off a packed delivery at a customer's door"
                file="/qyka-rider-handoff.jpg"
                className="aspect-[4/5] w-full sm:aspect-[5/4] lg:aspect-[4/5]"
              />
            </ClipReveal>
          </Reveal>

          <div>
            <Reveal y={24}>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">Who thrives</p>
              <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight sm:text-5xl">
                Built for people who already move through these streets.
              </SplitReveal>
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

      {/* REQUIREMENTS + FAQ */}
      <section className="bg-canvas-deep/60 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal y={24}>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">Before you apply</p>
              <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight sm:text-5xl">
                What you need.
              </SplitReveal>
            </Reveal>
            <Stagger className="mt-8 space-y-3" stagger={0.08}>
              {[
                "A smartphone with data — pickup and drop-off details live in the app",
                "Your own bike, keke, or car in good working order",
                "A bank account or wallet your delivery earnings can be paid into",
                "Valid ID (and a rider's license, where your vehicle requires one)",
              ].map((req) => (
                <StaggerItem key={req} y={16} scale={0.99}>
                  <div className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(33,26,20,0.06)] ring-1 ring-ink/5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green text-white">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <p className="text-sm leading-relaxed text-ink/70">{req}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          <div>
            <Reveal y={24}>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">Common questions</p>
              <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight sm:text-5xl">
                Before you ask.
              </SplitReveal>
            </Reveal>
            <Stagger className="mt-8 divide-y divide-ink/8 border-y border-ink/8" stagger={0.08}>
              {[
                {
                  q: "How am I paid?",
                  a: "Earnings are tracked per completed delivery in the app and paid out to your linked account.",
                },
                {
                  q: "Do I deliver across the whole city?",
                  a: "No — you register for an area or market, and only see deliveries starting near you.",
                },
                {
                  q: "What if I can't find the address?",
                  a: "Drop-off details and the customer's contact are in the app — chat with them directly if plans change.",
                },
              ].map((item) => (
                <StaggerItem key={item.q} y={16} scale={0.99}>
                  <div className="py-5">
                    <p className="font-display font-bold text-ink">{item.q}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{item.a}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>


      {/* APPLY — white band like home closer. No dark surfaces anywhere in
          this palette; separation from the cream page comes from bg-surface. */}
      <div className="relative bg-surface">
        <section id="apply" className="scroll-mt-28 px-4 py-16 text-ink sm:px-6 sm:py-20">
          <Reveal
            y={32}
            className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center"
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange-dark">Apply</p>
              <SplitReveal as="h2" className="mt-2 font-serif text-4xl italic tracking-tight sm:text-5xl">
                Ready to ride for Qyka?
              </SplitReveal>
              <p className="mt-3 max-w-md text-ink/70">
                Tell us who you are, your area, and what you ride. We&apos;ll reach out as pilot
                slots open.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink/70">
                <li className="flex gap-2">
                  <span className="text-brand-orange-dark">→</span> One pickup, one drop-off per run
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-orange-dark">→</span> Orders arrive packed and photographed
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-orange-dark">→</span> Earnings tracked on completed deliveries
                </li>
              </ul>
            </div>
            <div className="rounded-[1.5rem] bg-canvas p-6 text-ink sm:p-8">
              <h3 className="font-display text-lg font-bold">Rider application</h3>
              <p className="mt-1 text-sm text-ink/50">Opens your mail app to riders@quika.ng</p>
              <div className="mt-5">
                <RiderApplyForm />
              </div>
            </div>
          </Reveal>
        </section>
      </div>

      <MarketingFooter />
      <HelpWidget />
    </div>
  );
}
