"use client";

import { useState } from "react";
import { LANDING } from "@/content/landing";
import Chip from "@/components/Chip";
import PriceRow from "@/components/marketing/PriceRow";

export default function PricingCalculator({ className = "" }: { className?: string }) {
  const [pricingTier, setPricingTier] = useState<number>(1); // default to middle tier (25k)

  const selectedTier = LANDING.pricing.tiers[pricingTier] || LANDING.pricing.tiers[0];
  const serviceFee = Math.round((selectedTier.amount * LANDING.pricing.fees.serviceFeePercent) / 100);
  const deliveryFee = LANDING.pricing.fees.deliveryFee;
  const total = selectedTier.amount + serviceFee + deliveryFee;

  return (
    <div className={`rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-sm ${className}`}>
      <p className="font-semibold text-ink mb-4">Select basket size</p>
      <div className="flex flex-wrap gap-2 mb-8">
        {LANDING.pricing.tiers.map((tier, idx) => (
          <Chip
            key={tier.label}
            selected={pricingTier === idx}
            onClick={() => setPricingTier(idx)}
          >
            {tier.label}
          </Chip>
        ))}
      </div>
      
      <div className="space-y-1 border-t border-line pt-6">
        <PriceRow 
          label="Groceries (at cost)" 
          amount={selectedTier.amount} 
          tooltip="We don't mark up items. You pay what the vendor charges."
        />
        <PriceRow 
          label={`Service fee (${LANDING.pricing.fees.serviceFeePercent}%)`} 
          amount={serviceFee} 
          tooltip="Covers agent effort and platform processing."
        />
        <PriceRow 
          label="Delivery fee" 
          amount={deliveryFee} 
          tooltip="Flat fee to get it from the market to your door."
        />
        <div className="flex justify-between py-2 text-sm text-muted">
          <span>Add-item fee (optional)</span>
          <span>&#8358;{LANDING.pricing.fees.addItemFee} only for additions</span>
        </div>
        <div className="border-t border-line-strong pt-4 mt-2">
          <PriceRow 
            label="Total estimated" 
            amount={total} 
            highlight 
          />
        </div>
      </div>
      <p className="mt-4 text-xs text-faint">
        *Estimates are illustrative. You only ever pay for what is actually purchased plus delivery and service fee.
      </p>
    </div>
  );
}
