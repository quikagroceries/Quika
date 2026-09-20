'use client';

import Image from "next/image";
import Card from "./Card";
import Icon from "./Icon";
import StatusBadge from "./StatusBadge";
import MarketArt from "./shop/MarketArt";
import { marketTone } from "@/lib/vendorVisuals";
import { coverImageForMarket } from "@/lib/marketDirectory";
import { illustrationForItem } from "@/lib/foodVisuals";

import { isHistoryStatus } from "@/lib/orderStatus";

// The single order-summary card shape used everywhere a list of orders is
// shown (customer's unified History, agent lists, Track): goods bought with
// their prices, market, the other participant, total, and date. Deliberately
// NOT the full record — no transfer/fee/EMTL breakdown, no chat. The full
// order (including all of that) is still one tap away via onClick, per the
// task: this is a display filter, nothing here is deleted or hidden
// server-side. `footer` is an optional extra node (e.g. a delete action)
// rendered below the summary, so callers don't need a second card shape for
// that. Market leads the card the way a restaurant name leads a delivery-app
// card — the market IS the identity here, so it isn't repeated lower as a
// plain row.
//
// `market` (optional, full API market row) picks up the same tone+cover
// system Shop's own market cards use, so an order card reads as "that
// market" at a glance instead of every card wearing an identical icon.
// Callers that don't have it yet fall back to the plain icon well.
//
// `statusLine` (optional) is the human "Agent is shopping — 3 of 4 bought"
// sentence. Track passes it; History/agent lists don't, and are unchanged.
function HistoryOrderCard({ order, market, marketName, counterpartLabel, counterpartId, statusLine, onClick, footer, hideTotal }: any) {
  const allItems = order.items || [];
  const boughtItems = allItems.filter((it: any) => it.confirmed_price != null);
  const date = order.created_at ? new Date(order.created_at).toLocaleDateString() : null;
  const done = isHistoryStatus(order.status);
  const name = market?.name || marketName;

  // Only show a total once there actually IS one - `grand_total` stays 0.00
  // until finish_shopping runs, and a card proudly announcing "Order total
  // ₦0" on a list that hasn't been shopped yet is just misinformation.
  const total = Number(order.grand_total) || 0;
  const showTotal = !hideTotal && total > 0;

  const progress = allItems.length > 0 ? boughtItems.length / allItems.length : 0;
  const showProgress = allItems.length > 0 && !done && boughtItems.length > 0;

  return (
    // Fixed height, small - was 340px with a progress bar AND up to 3 item
    // rows AND an agent row, which made the box much bigger than a glance-
    // at-a-grid card needs to be. Trimmed the content to what actually
    // matters at this size (status line, up to 2 items, total) and dropped
    // the height to match instead of padding a tall box with empty space.
    <Card interactive={!!onClick} onClick={onClick} className="group relative flex h-[210px] flex-col overflow-hidden">
      {/* Same quiet peach glow the hero cards use, so these read as part of
          the same family rather than plain white boxes. */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-orange/[0.07] blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {market ? (
            <MarketArt
              tone={marketTone(market.name, market.city)}
              title={market.name}
              image={coverImageForMarket(market)}
              compact
              className="h-10 w-10 shrink-0 rounded-2xl"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/15 text-brand-orange-dark">
              <Icon name="store" className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-extrabold tracking-tight text-ink">
              {name || "Market"}
            </p>
            {date && <p className="text-xs text-faint">{date}</p>}
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {statusLine && (
        <p className="relative mt-2 line-clamp-1 text-sm font-semibold text-ink/80">{statusLine}</p>
      )}

      <div className="relative mt-2 min-h-0 flex-1 space-y-1 overflow-hidden">
        {boughtItems.length > 0 ? (
          <>
            {boughtItems.slice(0, 2).map((it: any) => (
              <div key={it.id} className="flex items-center justify-between gap-3 text-sm text-ink/80">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sunken-2 p-1">
                    <Image
                      src={illustrationForItem(it.description)}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <span className="truncate">{it.description}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  ₦{Number(it.confirmed_price).toLocaleString()}
                </span>
              </div>
            ))}
            {boughtItems.length > 2 && (
              <p className="pl-8 text-xs font-semibold text-faint">
                +{boughtItems.length - 2} more
              </p>
            )}
          </>
        ) : allItems.length > 0 ? (
          // Nothing bought yet (or nothing ever was, on a stopped order) -
          // still show what's actually ON the list instead of a single bare
          // sentence in an otherwise empty card. Same icon-well row shape
          // as the bought-item rows, just muted and priced as an estimate
          // rather than a confirmed amount, so a sparse status (draft,
          // disputed, cancelled) still reads as a real, populated card.
          <>
            <p className="text-[11px] font-bold uppercase tracking-wide text-faint">
              {done ? "Not bought" : "Waiting to be shopped"}
            </p>
            {allItems.slice(0, 3).map((it: any) => (
              <div key={it.id} className="flex items-center justify-between gap-3 text-sm text-faint">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sunken-2 p-1">
                    <Image
                      src={illustrationForItem(it.description)}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <span className="truncate">{it.description}</span>
                </span>
                {it.listed_price != null && (
                  <span className="shrink-0 tabular-nums">
                    est. ₦{Number(it.listed_price).toLocaleString()}
                  </span>
                )}
              </div>
            ))}
            {allItems.length > 3 && (
              <p className="pl-8 text-xs font-semibold text-faint">
                +{allItems.length - 3} more
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-faint">{done ? "No items were bought." : "No items yet."}</p>
        )}
      </div>

      {showTotal && (
        <div className="relative mt-2 flex items-center justify-between border-t border-dashed border-line-strong pt-2 text-ink">
          <span className="text-sm font-bold">Order total</span>
          <span className="font-display text-base font-extrabold tabular-nums">
            ₦{total.toLocaleString()}
          </span>
        </div>
      )}

      {footer && (
        <div className="relative mt-3 border-t border-dashed border-line-strong pt-3" onClick={(e) => e.stopPropagation()}>
          {footer}
        </div>
      )}
    </Card>
  );
}

export default HistoryOrderCard;
