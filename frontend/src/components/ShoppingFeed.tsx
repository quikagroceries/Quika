'use client';

import { useMemo, useState } from "react";
import Image from "next/image";
import Card from "./Card";
import Icon from "./Icon";
import Button from "./Button";
import Input from "./Input";
import Modal from "./Modal";
import { computeSavings, naira } from "@/lib/orderMath";
import { illustrationForItem } from "@/lib/foodVisuals";

// Mirrors app/orders/fees.py's ADD_ITEM_FEE - the backend is the source of
// truth and re-validates this itself, but the customer needs to see the
// real number before confirming, not after the charge already happened.
const ADD_ITEM_FEE = 500;

/**
 * The customer-facing live view while the agent is physically shopping the
 * list. Purchases land here as they happen — real price against the
 * customer's own estimate, plus the stall photo — with a running "saved so
 * far" tally on top. Money is summed from the items (see orderMath), never
 * from order.grand_total, which stays 0.00 until finish_shopping.
 *
 * Attention items (per-item price approvals, the whole-order spending cap)
 * are rendered by OrderDetail above/beside this — the feed itself only owns
 * the bought/unavailable/pending list and the savings header.
 */

function itemRank(it: any): number {
  if (it.confirmed_price != null) return 0; // bought
  if (it.availability === "unavailable" || it.availability === "overage_pending") return 1;
  if (it.availability === "dropped") return 3;
  return 2; // pending / buy_elsewhere
}

function DeltaChip({ listed, actual }: { listed: number; actual: number }) {
  const d = listed - actual;
  if (Math.abs(d) < 0.005) {
    return (
      <span className="rounded-full bg-sunken px-2 py-0.5 text-[0.7rem] font-bold text-muted">
        on your estimate
      </span>
    );
  }
  const under = d > 0;
  return (
    <span
      className={
        "rounded-full px-2 py-0.5 text-[0.7rem] font-bold " +
        (under ? "bg-brand-green/10 text-brand-green" : "bg-brand-orange/15 text-brand-orange-dark")
      }
    >
      {under ? "−" : "+"}
      {naira(Math.abs(d)).slice(1)} {under ? "under" : "over"}
    </span>
  );
}

function ShoppingFeed({ items, purchases, onDecide, busy, status, onAddItem }: any) {
  const [preview, setPreview] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addDescription, setAddDescription] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addError, setAddError] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const done = status === "awaiting_payment";
  // Additions only, while the agent is actively out shopping - matches
  // orders.service.add_item's own status gate exactly. Once shopping's
  // finished there's nothing left to buy it with; before it starts, the
  // customer can just edit the draft list directly instead.
  const canAddItem = status === "shopping";

  function closeAdd() {
    setAddOpen(false);
    setAddDescription("");
    setAddPrice("");
    setAddNote("");
    setAddError("");
  }

  async function submitAddItem() {
    setAddError("");
    setAddBusy(true);
    try {
      await onAddItem({
        description: addDescription.trim(),
        listed_price: addPrice,
        requested_note: addNote.trim() || null,
      });
      closeAdd();
    } catch (e: any) {
      setAddError(e.message || "Could not add that item.");
    } finally {
      setAddBusy(false);
    }
  }

  const photoByTransfer: Record<string, string> = useMemo(
    () =>
      Object.fromEntries(
        (purchases || []).filter((p: any) => p.photo_ref).map((p: any) => [p.id, p.photo_ref])
      ),
    [purchases]
  );

  const s = useMemo(() => computeSavings(items), [items]);

  const ordered = useMemo(() => {
    return [...(items || [])].sort((a, b) => {
      const r = itemRank(a) - itemRank(b);
      if (r !== 0) return r;
      // most-recently bought first, so the feel is "this just happened"
      const ta = a.confirmed_at ? Date.parse(a.confirmed_at) : 0;
      const tb = b.confirmed_at ? Date.parse(b.confirmed_at) : 0;
      return tb - ta;
    });
  }, [items]);

  const savedPositive = s.saved > 0.005;
  const savedNegative = s.saved < -0.005;

  return (
    <div className="flex flex-col gap-3">
      {/* Savings header */}
      {/* Soft tinted tile, no outline - same reason as every other
          attention surface in this flow. */}
      <Card className="border-transparent bg-brand-green/[0.07]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green/12 text-brand-green">
            <Icon name="trending" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-faint">
              {s.boughtCount} of {s.totalCount} bought ·{" "}
              {done ? "shopping finished — balance to pay" : "agent is shopping now"}
            </p>
            {savedPositive ? (
              <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-brand-green">
                {naira(s.saved)} under your estimate
              </p>
            ) : savedNegative ? (
              <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-brand-orange-dark">
                {naira(-s.saved)} over your estimate
              </p>
            ) : (
              <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink">
                Right on your estimate
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span>
                Spent so far <span className="font-semibold text-ink">{naira(s.actualSoFar)}</span>
              </span>
              <span>
                Projected goods{" "}
                <span className="font-semibold text-ink">{naira(s.projectedGoods)}</span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Live item feed - one paper-style list, not a stack of separate
          bars. Each row is just a row, divided by a thin dashed rule like
          items on a receipt; nothing here has its own card/pill background.
          A bought item's name gets struck through and its icon well fades,
          the way a hand-checked grocery list looks once you've crossed
          something off - not a status badge bolted onto an otherwise
          unchanged row. */}
      <div className="divide-y divide-dashed divide-line-strong rounded-3xl border border-line bg-surface shadow-sm">
        {ordered.map((item: any) => {
          const bought = item.confirmed_price != null;
          const listed = item.listed_price != null ? Number(item.listed_price) : null;
          const photo = item.vendor_transfer_id ? photoByTransfer[item.vendor_transfer_id] : null;
          const dropped = item.availability === "dropped";
          const unavailable = item.availability === "unavailable";
          const elsewhere = item.availability === "buy_elsewhere";

          return (
            <div key={item.id} id={`item-${item.id}`} className="flex items-start gap-3 px-4 py-3 first:pt-4 last:pb-4">
              <span
                className={
                  "relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunken-2 p-1.5 transition-opacity " +
                  (bought ? "opacity-40" : "")
                }
              >
                <Image src={illustrationForItem(item.description)} alt="" className="h-full w-full object-contain" />
                {(bought || unavailable) && (
                  <span
                    className={
                      "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-surface " +
                      (bought ? "bg-brand-green text-white" : "bg-brand-orange text-[#1A1A1A]")
                    }
                  >
                    {bought ? <Icon name="check" className="h-3 w-3" /> : <Icon name="alert" className="h-3 w-3" />}
                  </span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={
                      "min-w-0 truncate font-semibold " +
                      (bought
                        ? "text-faint line-through decoration-2"
                        : dropped
                          ? "text-faint line-through"
                          : "text-ink")
                    }
                  >
                    {item.description}
                  </span>
                  {bought && (
                    <span className="shrink-0 font-display text-base font-extrabold tabular-nums text-faint">
                      {naira(item.confirmed_price)}
                    </span>
                  )}
                </div>

                {item.requested_note && !bought && (
                  <p className="mt-0.5 text-sm text-faint">{item.requested_note}</p>
                )}

                {/* bought → estimate delta */}
                {bought && listed != null && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-xs text-faint">
                      est. {naira(listed)}
                    </span>
                    <DeltaChip listed={listed} actual={Number(item.confirmed_price)} />
                  </div>
                )}

                {/* not bought → status line */}
                {!bought && (
                  <p className="mt-0.5 text-sm text-faint">
                    {dropped
                      ? "Dropped"
                      : elsewhere
                        ? "Agent will buy this elsewhere"
                        : unavailable
                          ? "Not at the market — what should we do?"
                          : listed != null
                            ? `Waiting to be bought · you estimated ${naira(listed)}`
                            : "Waiting to be bought"}
                  </p>
                )}

                {unavailable && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => onDecide(item.id, "buy_elsewhere")}
                      disabled={busy}
                      className="text-sm"
                    >
                      Buy elsewhere
                    </Button>
                    <Button
                      variant="neutral"
                      onClick={() => onDecide(item.id, "dropped")}
                      disabled={busy}
                      className="text-sm"
                    >
                      Drop item
                    </Button>
                  </div>
                )}
              </div>

              {photo && (
                <button
                  type="button"
                  onClick={() => setPreview(photo)}
                  aria-label={`View purchase photo for ${item.description}`}
                  className="relative shrink-0 overflow-hidden rounded-lg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="" className="h-14 w-14 object-cover" />
                  <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-tl-md bg-black/55 text-white">
                    <Icon name="camera" className="h-2.5 w-2.5" />
                  </span>
                </button>
              )}
            </div>
          );
        })}
        {canAddItem && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sunken-2"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-line-strong text-brand-orange-dark">
              <Icon name="plus" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-brand-orange-dark">Add an item</span>
              <span className="block text-xs text-faint">₦{ADD_ITEM_FEE} flat fee, added to your bill</span>
            </span>
          </button>
        )}
      </div>

      <Modal open={addOpen} onClose={addBusy ? undefined : closeAdd} title="Add an item">
        <p className="mb-3 text-sm text-muted">
          Your agent will pick this up while they're still at the market. A flat ₦{ADD_ITEM_FEE} fee
          applies, charged from your wallet now - additions only, items already on your list can't be
          removed this way.
        </p>
        <div className="space-y-3">
          <Input
            placeholder="What should we add? (e.g. A bag of onions)"
            value={addDescription}
            onChange={(e) => setAddDescription(e.target.value)}
            autoFocus
          />
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="What you expect to pay (₦)"
            value={addPrice}
            onChange={(e) => setAddPrice(e.target.value)}
          />
          <Input
            placeholder="Note for your agent (optional)"
            value={addNote}
            onChange={(e) => setAddNote(e.target.value)}
          />
        </div>
        {addError && <p className="mt-3 text-sm text-red-600">{addError}</p>}
        <Button
          onClick={submitAddItem}
          busy={addBusy}
          disabled={!addDescription.trim() || !addPrice || Number(addPrice) <= 0}
          fullWidth
          className="mt-4"
        >
          Add for ₦{ADD_ITEM_FEE}
        </Button>
      </Modal>

      {preview && (
        <div
          className="fixed inset-0 z-[1800] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Purchase proof" className="max-h-full max-w-full rounded-lg" />
          <button
            type="button"
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

export default ShoppingFeed;
