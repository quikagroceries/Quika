"use client";

import { BoltMark } from "./BoltBasket";

/**
 * Honest device mock — showing the ListBuilder interface with typing/activity
 */
export default function DeviceMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      {/* Phone frame */}
      <div className="rounded-[2rem] border-[10px] border-ink bg-ink shadow-[0_24px_60px_rgba(33,26,20,0.35)]">
        <div className="flex h-[520px] flex-col overflow-hidden rounded-[1.35rem] bg-surface">
          {/* Status bar */}
          <div className="flex shrink-0 items-center justify-between bg-surface px-4 pb-2 pt-3">
            <span className="text-[10px] font-bold text-ink">9:41</span>
            <div className="h-4 w-24 rounded-full bg-ink/10" />
            <span className="text-[10px] font-semibold text-ink/50">5G</span>
          </div>

          {/* App header */}
          <div className="shrink-0 border-b border-line bg-surface px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-bold tracking-tight text-ink">Your list</p>
              </div>
              <span className="rounded-full bg-canvas-deep px-2.5 py-1 text-[10px] font-bold text-ink">
                Bodija Market
              </span>
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 space-y-2 overflow-y-auto bg-canvas px-3 py-4">
            {/* Item 1 */}
            <div className="flex items-center justify-between rounded-2xl border border-transparent bg-surface px-3 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green text-surface">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-muted line-through">Tomatoes &middot; 1 basket</span>
                </div>
              </div>
              <span className="text-sm font-bold text-muted line-through">₦4,500</span>
            </div>

            {/* Item 2 */}
            <div className="flex items-center justify-between rounded-2xl border border-transparent bg-surface px-3 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green text-surface">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-muted line-through">Fresh pepper &middot; paint</span>
                </div>
              </div>
              <span className="text-sm font-bold text-muted line-through">₦500</span>
            </div>

            {/* Item 3 */}
            <div className="flex items-center justify-between rounded-2xl border border-transparent bg-surface px-3 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green text-surface">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-muted line-through">Garri &middot; 2 cups</span>
                </div>
              </div>
              <span className="text-sm font-bold text-muted line-through">₦1,200</span>
            </div>

            {/* Item 4 (Current) */}
            <div className="relative overflow-hidden rounded-2xl border border-brand-orange/20 bg-brand-orange/10 px-3 py-3">
              <div className="absolute inset-0 animate-pulse bg-brand-orange/5" />
              <div className="relative flex w-full flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-brand-orange bg-surface">
                    <div className="h-2 w-2 rounded-full bg-brand-orange" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-ink">Palm oil &middot; 2 litres</span>
                  </div>
                </div>
                <div className="ml-8 w-fit rounded bg-surface/80 px-2 py-1">
                  <span className="text-[10px] font-bold text-brand-orange-dark">Ngozi is buying this...</span>
                </div>
              </div>
            </div>

            {/* Item 5 */}
            <div className="flex items-center justify-between rounded-2xl border border-transparent bg-surface px-3 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-line bg-surface"></div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">Maggi cubes &middot; 1 pack</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="shrink-0 border-t border-line bg-surface px-3 py-3">
            <div className="flex items-center gap-2 rounded-full border border-line-strong bg-canvas px-3 py-2">
              <input
                type="text"
                placeholder="Add an item..."
                className="flex-1 bg-transparent text-xs text-ink placeholder-faint outline-none"
                disabled
              />
              <button className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange text-ink transition-transform active:scale-95">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M1 6L11 2L7 11L6 7L1 6Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating bolt accent */}
      <div className="absolute -right-3 -top-3 z-10 hidden sm:block">
        <BoltMark bouncing className="group h-12 w-12 shadow-stamp" />
      </div>
    </div>
  );
}
