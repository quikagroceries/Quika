"use client";

import Image from "next/image";
import agentCustomerConversation from "@/assets/illustrations/agent-customer-conversation.png";
import badgeRealTime from "@/assets/illustrations/badge-real-time-updates.png";
import badgeFreshness from "@/assets/illustrations/badge-fresh-guarantee.png";
import badgeHumanFirst from "@/assets/illustrations/concierge.png";
import badgeExpress from "@/assets/illustrations/badge-express-delivery.png";
import pastaBag from "@/assets/illustrations/pasta-bag.png";
import riceBag from "@/assets/illustrations/rice-bag.png";
import squiggle1 from "@/assets/illustrations/decorative-squiggle-1.png";

export function ShopHeroSpotlight({
  onStartList,
  onBrowseMarkets,
}: {
  onStartList?: () => void;
  onBrowseMarkets?: () => void;
}) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8 lg:p-10">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-brand-orange/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-64 w-64 rounded-full bg-[#F9E0CC]/40 blur-3xl" />

      {/* Same quiet line-art accents as the sidebar/headers, tucked in this
          card's own empty corners (top-left, above the badge strip on the
          bottom-left) rather than crowding the headline/CTA/hero-image
          columns that already fill the rest of the card. */}
      <Image
        src={squiggle1}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -left-3 top-4 hidden w-14 -rotate-12 opacity-[0.16] sm:block"
      />
      <Image
        src={pastaBag}
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-4 left-4 hidden w-12 rotate-6 opacity-[0.14] lg:block"
      />
      <Image
        src={riceBag}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-2 bottom-24 hidden w-14 -rotate-6 opacity-[0.12] xl:block"
      />

      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-12">
        {/* Left Column: Headline & Value Proposition */}
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/15 px-3 py-1 text-xs font-bold text-brand-orange-dark">
            <span className="flex h-2 w-2 rounded-full bg-brand-orange animate-pulse" />
            Personal Shopping & Concierge Service
          </div>

          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl lg:text-4xl">
            A personal agent shops the market on your behalf.
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            From fresh plantains at open-air stalls to groceries and home appliances — our trained
            agents inspect quality, bargain in real-time, send photo updates, and deliver to your door.
          </p>

          {/* Quick Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {onStartList && (
              <button
                type="button"
                onClick={onStartList}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-orange px-6 text-sm font-bold text-[#1A1A1A] shadow-xs transition hover:bg-brand-orange-dark active:bg-brand-orange-dark"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Write Shopping List
              </button>
            )}

            {onBrowseMarkets && (
              <button
                type="button"
                onClick={onBrowseMarkets}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-5 text-sm font-bold text-ink transition hover:border-line-strong hover:bg-sunken-2 active:bg-sunken"
              >
                Browse Markets & Stalls
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Hero Illustration */}
        <div className="flex justify-center lg:col-span-5">
          <div className="relative max-w-xs sm:max-w-sm">
            <Image
              src={agentCustomerConversation}
              alt="Personal agent coordinating with customer"
              className="h-auto w-full object-contain drop-shadow-md"
              priority
            />
          </div>
        </div>
      </div>

      {/* Feature Badges Strip with Meaningful Illustrated Badges */}
      <div className="relative mt-8 grid grid-cols-1 gap-3 border-t border-dashed border-line-strong pt-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl bg-sunken-2/70 p-3 transition hover:bg-sunken-2">
          <div className="h-10 w-10 shrink-0">
            <Image src={badgeRealTime} alt="" className="h-full w-full object-contain" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-ink">Real-time Updates</h4>
            <p className="text-[11px] text-muted">Live chat & photo proof</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-sunken-2/70 p-3 transition hover:bg-sunken-2">
          <div className="h-10 w-10 shrink-0">
            <Image src={badgeHumanFirst} alt="" className="h-full w-full object-contain" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-ink">Human Concierge</h4>
            <p className="text-[11px] text-muted">Trained market bargainers</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-sunken-2/70 p-3 transition hover:bg-sunken-2">
          <div className="h-10 w-10 shrink-0">
            <Image src={badgeFreshness} alt="" className="h-full w-full object-contain" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-ink">Freshness Guarantee</h4>
            <p className="text-[11px] text-muted">Handpicked prime quality</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-sunken-2/70 p-3 transition hover:bg-sunken-2">
          <div className="h-10 w-10 shrink-0">
            <Image src={badgeExpress} alt="" className="h-full w-full object-contain" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-ink">Direct Delivery</h4>
            <p className="text-[11px] text-muted">Straight to your doorstep</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShopHeroSpotlight;
