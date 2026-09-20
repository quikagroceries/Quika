"use client";

import Link from "next/link";
import Button from "@/components/Button";
import Icon from "@/components/Icon";
import { useShop } from "./ShopContext";

function ShopBag() {
  const { bagOpen, setBagOpen, listDraft, market, vendor, step, setStep } = useShop();

  if (!bagOpen) return null;

  const items = listDraft?.items || [];
  const empty = !listDraft || listDraft.itemCount === 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Your list">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="Close"
        onClick={() => setBagOpen(false)}
      />
      <aside className="relative z-[1] flex h-full w-full max-w-md flex-col bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-start justify-between gap-3 border-b border-[#ebe7e0] px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">Your list</h2>
            <p className="mt-0.5 text-sm text-[#6b635a]">
              {market?.name || "No market yet"}
              {vendor ? ` · ${vendor.name}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBagOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#6b635a] hover:bg-[#f0eeeb]"
            aria-label="Close bag"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f7f5f2] px-5 py-4">
          {empty ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#8a8178]">
                <Icon name="basket" className="h-5 w-5" />
              </span>
              <p className="font-display text-lg font-bold text-ink">Nothing here yet</p>
              <p className="mt-1 max-w-xs text-sm text-[#6b635a]">
                Build your list — your agent bargains the real prices at the market.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((it: any, i: number) => (
                <li key={i} className="rounded-xl border border-[#ebe7e0] bg-white px-4 py-3">
                  <p className="font-semibold text-ink">{it.description}</p>
                  <p className="mt-0.5 text-sm text-[#6b635a]">
                    {it.listed_price != null ? `Estimate ₦${it.listed_price}` : "No price yet"}
                    {it.quantity > 1 ? ` · qty ${it.quantity}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[#ebe7e0] bg-white px-5 py-4">
          {!empty && (
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-[#6b635a]">Your estimate</span>
              <span className="font-display text-2xl font-extrabold text-ink">
                ₦{(listDraft?.goodsTotal || 0).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {step === "list" ? (
              <Button fullWidth variant="neutral" onClick={() => setBagOpen(false)}>
                Keep editing
              </Button>
            ) : (
              <Button
                fullWidth
                onClick={() => {
                  setBagOpen(false);
                  setStep("list");
                }}
              >
                {empty ? "Build your list" : "Edit list"}
              </Button>
            )}
            {!market && !empty && step !== "list" && step !== "market" && (
              <Button
                fullWidth
                variant="neutral"
                onClick={() => {
                  setBagOpen(false);
                  setStep("market");
                }}
              >
                Choose a market
              </Button>
            )}
            <Link
              href="/"
              className="py-1 text-center text-sm font-semibold text-[#8a8178] hover:text-ink"
              onClick={() => setBagOpen(false)}
            >
              Quika home
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default ShopBag;
