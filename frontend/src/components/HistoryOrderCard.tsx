'use client';

import Card from "./Card";
import StatusBadge from "./StatusBadge";

import { isHistoryStatus } from "@/lib/orderStatus";

// The single order-summary card shape used everywhere a list of orders is
// shown (customer's unified History, agent lists): goods bought with their
// prices, market, the other participant, total, and date. Deliberately NOT
// the full record — no transfer/fee/EMTL breakdown, no chat. The full order
// (including all of that) is still one tap away via onClick, per the task:
// this is a display filter, nothing here is deleted or hidden server-side.
// `footer` is an optional extra node (e.g. a delete action) rendered below
// the summary, so callers don't need a second card shape for that.
function HistoryOrderCard({ order, marketName, counterpartLabel, counterpartId, onClick, footer, hideTotal }: any) {
  const boughtItems = (order.items || []).filter((it) => it.confirmed_price != null);
  const date = order.created_at ? new Date(order.created_at).toLocaleDateString() : null;
  const done = isHistoryStatus(order.status);

  return (
    <Card interactive={!!onClick} onClick={onClick}>
      <div className="flex items-center justify-between">
        <StatusBadge status={order.status} />
        {date && <span className="text-xs text-slate-400">{date}</span>}
      </div>

      <div className="mt-2 space-y-1">
        {boughtItems.length > 0 ? (
          boughtItems.map((it) => (
            <div key={it.id} className="flex justify-between text-sm text-slate-700">
              <span className="truncate pr-2">{it.description}</span>
              <span className="shrink-0 font-semibold">₦{it.confirmed_price}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">
            {done ? "No items were bought." : `${(order.items || []).length} item(s), not yet shopped.`}
          </p>
        )}
      </div>

      <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-sm text-slate-600">
        <div className="flex justify-between">
          <span>Market</span>
          <span>{marketName || "—"}</span>
        </div>
        {counterpartLabel && (
          <div className="flex justify-between">
            <span>{counterpartLabel}</span>
            <span>{counterpartId ? `${counterpartId.slice(0, 8)}…` : "—"}</span>
          </div>
        )}
        {/* hideTotal: the agent's own History list never shows the
            customer's overall order total - see Orders.jsx. */}
        {!hideTotal && (
          <div className="mt-1 flex justify-between text-slate-900">
            <span className="font-semibold">Order total</span>
            <span className="font-bold">₦{order.grand_total}</span>
          </div>
        )}
      </div>

      {footer && (
        <div className="mt-3 border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
          {footer}
        </div>
      )}
    </Card>
  );
}

export default HistoryOrderCard;
