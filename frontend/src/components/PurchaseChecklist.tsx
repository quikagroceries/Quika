'use client';

import { useState } from "react";
import Image from "next/image";
import Icon from "./Icon";
import { illustrationForItem } from "@/lib/foodVisuals";

// Phase 1: a clean bought/not-bought checklist for the paid order, with each
// stall's purchase photo (proof of goods) viewable right next to the item it
// covers - via item.vendor_transfer_id, set by jit.service.pay_vendor.
function PurchaseChecklist({ items, purchases }: any) {
  const [preview, setPreview] = useState<any>(null);
  const photoByTransfer = Object.fromEntries(
    (purchases || []).filter((p) => p.photo_ref).map((p) => [p.id, p.photo_ref])
  );

  return (
    <div>
      <p className="mb-2 font-bold text-ink">Bought items</p>
      {/* Paper list, not a stack of bars - a bought item's name is struck
          through and its icon well fades, same convention as ShoppingFeed's
          live list this is the finished record of. */}
      <div className="divide-y divide-dashed divide-line-strong rounded-3xl border border-line bg-surface shadow-sm">
        {items.map((item) => {
          const bought = item.confirmed_price != null;
          const dropped = !bought && item.availability === "dropped";
          const photo = item.vendor_transfer_id ? photoByTransfer[item.vendor_transfer_id] : null;
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 first:pt-4 last:pb-4">
              <span
                className={
                  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunken-2 p-1.5 transition-opacity " +
                  (bought ? "opacity-40" : "")
                }
              >
                <Image src={illustrationForItem(item.description)} alt="" className="h-full w-full object-contain" />
                {bought && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-white ring-2 ring-surface">
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className={"font-semibold " + (bought ? "text-faint line-through decoration-2" : "text-ink " + (dropped ? "line-through" : ""))}>
                  {item.description}
                </div>
                <div className={"text-sm " + (bought ? "font-semibold text-faint" : "text-faint")}>
                  {bought ? `₦${item.confirmed_price}` : dropped ? "Dropped" : "Not bought"}
                </div>
              </div>
              {photo && (
                <button
                  onClick={() => setPreview(photo)}
                  aria-label="View purchase photo"
                  className="shrink-0 overflow-hidden rounded-lg"
                >
                  <img src={photo} alt="" className="h-12 w-12 object-cover" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-[1800] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreview(null)}
        >
          <img src={preview} alt="Purchase proof" className="max-h-full max-w-full rounded-lg" />
          <button
            onClick={() => setPreview(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <Icon name="close" className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}

export default PurchaseChecklist;
