'use client';

import Card from "./Card";
import Icon from "./Icon";
import StatusBadge from "./StatusBadge";

import { isHistoryStatus } from "@/lib/orderStatus";

// The single order-summary card shape used everywhere a list of orders is
// shown (customer's unified History, agent lists): goods bought with their
// prices, market, the other participant, total, and date. Deliberately NOT
// the full record — no transfer/fee/EMTL breakdown, no chat. The full order
// (including all of that) is still one tap away via onClick, per the task:
// this is a display filter, nothing here is deleted or hidden server-side.
// `footer` is an optional extra node (e.g. a delete action) rendered below
// the summary, so callers don't need a second card shape for that. Market
// leads the card the way a restaurant name leads a delivery-app card — the
// market IS the identity here, so it isn't repeated lower as a plain row.
function HistoryOrderCard({ order, marketName, counterpartLabel, counterpartId, onClick, footer, hideTotal }: any) {
  const boughtItems = (order.items || []).filter((it) => it.confirmed_price != null);
  const date = order.created_at ? new Date(order.created_at).toLocaleDateString() : null;
  const done = isHistoryStatus(order.status);

  return (
    <Card interactive={!!onClick} onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
            <Icon name="store" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-extrabold tracking-tight text-ink">
              {marketName || "Market"}
            </p>
            {date && <p className="text-xs text-[#8a8178]">{date}</p>}
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-3 space-y-1">
        {boughtItems.length > 0 ? (
          boughtItems.map((it) => (
            <div key={it.id} className="flex justify-between text-sm text-ink/80">
              <span className="truncate pr-2">{it.description}</span>
              <span className="shrink-0 font-semibold tabular-nums">₦{it.confirmed_price}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-[#8a8178]">
            {done ? "No items were bought." : `${(order.items || []).length} item(s), not yet shopped.`}
          </p>
        )}
      </div>

      <div className="mt-3 space-y-1 border-t border-[#ebe7e0] pt-3 text-sm text-[#6b635a]">
        {counterpartLabel && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Icon name="user" className="h-3.5 w-3.5 text-[#8a8178]" />
              {counterpartLabel}
            </span>
            <span>{counterpartId ? `${counterpartId.slice(0, 8)}…` : "—"}</span>
          </div>
        )}
        {/* hideTotal: the agent's own History list never shows the
            customer's overall order total - see Orders.jsx. */}
        {!hideTotal && (
          <div className="mt-1.5 flex items-center justify-between text-ink">
            <span className="font-bold">Order total</span>
            <span className="font-display text-lg font-extrabold tabular-nums">
              ₦{Number(order.grand_total).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {footer && (
        <div className="mt-3 border-t border-[#ebe7e0] pt-3" onClick={(e) => e.stopPropagation()}>
          {footer}
        </div>
      )}
    </Card>
  );
}

export default HistoryOrderCard;
