"use client";

import { BoltMark } from "./BoltBasket";

/**
 * Honest device mock — mirrors Quika's real order-status timeline + chat
 * chrome (StatusBadge colors, DeliveryTracking row labels, ChatPanel tone).
 */
export default function DeviceMockup() {
  const rows = [
    { label: "Order placed", done: true, time: "9:12 AM" },
    { label: "Agent assigned & accepted", done: true, time: "9:14 AM" },
    { label: "Balance paid", done: true, time: "9:18 AM" },
    { label: "Packaging", done: false, current: true },
    { label: "Out for delivery", done: false },
    { label: "Delivered", done: false },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      {/* Phone frame */}
      <div className="rounded-[2rem] border-[10px] border-ink bg-ink shadow-[0_24px_60px_rgba(33,26,20,0.35)]">
        <div className="overflow-hidden rounded-[1.35rem] bg-slate-50">
          {/* Status bar */}
          <div className="flex items-center justify-between bg-white px-4 pb-2 pt-3">
            <span className="text-[10px] font-bold text-ink">9:41</span>
            <div className="h-4 w-24 rounded-full bg-ink/10" />
            <span className="text-[10px] font-semibold text-ink/50">5G</span>
          </div>

          {/* App header */}
          <div className="border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Order</p>
                <p className="font-display text-sm font-bold text-ink">Mile 12 · today</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold capitalize text-amber-700">
                packing
              </span>
            </div>
          </div>

          {/* Timeline — mirrors DeliveryTracking */}
          <div className="space-y-0 bg-white px-4 py-4">
            <p className="mb-3 text-xs font-bold text-ink">Order status</p>
            {rows.map((row, i) => (
              <div key={row.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold " +
                      (row.done
                        ? "bg-brand-green text-white"
                        : row.current
                        ? "bg-brand-orange text-white"
                        : "bg-slate-100 text-slate-400")
                    }
                  >
                    {row.done ? "✓" : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </span>
                  {i < rows.length - 1 && (
                    <div className={"my-0.5 w-0.5 flex-1 min-h-[18px] " + (row.done ? "bg-brand-green" : "bg-slate-200")} />
                  )}
                </div>
                <div className={"min-w-0 flex-1 " + (i < rows.length - 1 ? "pb-3" : "")}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={"text-xs font-semibold " + (row.done || row.current ? "text-ink" : "text-slate-400")}>
                      {row.label}
                    </p>
                    {row.time && <span className="text-[10px] text-slate-400">{row.time}</span>}
                    {row.current && (
                      <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[9px] font-bold text-brand-orange">
                        In progress
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chat strip — mirrors ChatPanel */}
          <div className="border-t border-slate-200 bg-slate-50 px-3 py-3">
            <div className="mb-2 flex items-center gap-2">
              <BoltMark className="h-6 w-6" />
              <p className="text-[11px] font-bold text-ink">Chat with agent</p>
            </div>
            <div className="space-y-2">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[11px] text-ink shadow-sm">
                Got the pepper — ₦500. Tomatoes are ₦1,400 today, ok to go?
              </div>
              <div className="ml-auto max-w-[75%] rounded-2xl rounded-tr-sm bg-brand-orange px-3 py-2 text-[11px] text-white">
                Yes, take them. Thanks!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating bolt accent */}
      <div className="absolute -right-3 -top-3 hidden sm:block">
        <BoltMark bouncing className="group h-12 w-12 shadow-stamp" />
      </div>
    </div>
  );
}
