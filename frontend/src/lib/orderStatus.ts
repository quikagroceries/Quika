// Shared order-status logic for the list filters and active/history split.
// Mirrors app/core/enums.py's OrderStatus values on the backend.

// "Done" statuses — display-only bucket, never a deletion. Full order
// records (transfers, fees, line items) stay in the database exactly as-is;
// this only decides which list/card a status shows up in on screen.
export const HISTORY_STATUSES = new Set(["delivered", "closed", "cancelled", "cancelled_unpaid"]);

export function isHistoryStatus(status) {
  return HISTORY_STATUSES.has(status);
}

// Mirrors orders.service.delete_order's guard exactly: pre-shopping AND no
// deposit paid. Takes the whole order (not just status) since deposit state
// isn't visible from status alone - a deposit can be paid on an
// agent_assigned order before shopping starts.
export function isDeletableOrder(order) {
  return (
    (order.status === "draft" || order.status === "proposed" || order.status === "agent_assigned") &&
    !order.deposit_paid_at
  );
}

// Mirrors orders.service.cancel_order's guard: same pre-shopping window as
// delete, but for the case delete refuses - a deposit already paid. Cancel
// refunds it instead of blocking, so this is the "delete-shaped" action's
// counterpart precisely where delete stops being available.
export function isCancellableOrder(order) {
  return (
    (order.status === "draft" || order.status === "proposed" || order.status === "agent_assigned") &&
    !!order.deposit_paid_at
  );
}

// Agent rating (#7): only once an order is genuinely finished - mirrors
// ratings.service.RATEABLE_STATUSES on the backend exactly.
export const RATEABLE_STATUSES = new Set(["delivered", "closed"]);

export function isRateable(status) {
  return RATEABLE_STATUSES.has(status);
}

// Chat scoped to the shopping window (#1): available from agent acceptance
// (status flips to agent_assigned) through finish-shopping (status flips to
// awaiting_payment) - the agent has no delivery role, so there's nothing
// left to coordinate about once shopping ends. Hidden after, not deleted -
// the messages themselves stay in the database untouched, for disputes.
export const CHAT_STATUSES = new Set(["agent_assigned", "shopping"]);

export function isChatAvailable(status) {
  return CHAT_STATUSES.has(status);
}

// Order matches the task's pill order: All, Active, Paid, Awaiting payment,
// Completed, Cancelled. Default selection is "active" (set by callers).
export const ORDER_FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "active", label: "Active", test: (o) => !isHistoryStatus(o.status) },
  { key: "paid", label: "Paid", test: (o) => o.status === "paid" },
  { key: "awaiting_payment", label: "Awaiting payment", test: (o) => o.status === "awaiting_payment" },
  { key: "completed", label: "Completed", test: (o) => o.status === "delivered" || o.status === "closed" },
  { key: "cancelled", label: "Cancelled", test: (o) => o.status === "cancelled" || o.status === "cancelled_unpaid" },
];

export function filterOrders(orders, filterKey) {
  const filter = ORDER_FILTERS.find((f) => f.key === filterKey) || ORDER_FILTERS[1];
  return orders.filter(filter.test);
}

// One human-readable "what's happening right now" line per status, shared by
// every surface that summarizes an in-progress order (active-order banner,
// Shop's own headline card, the order detail header) so the wording never
// drifts between them.
export function summarizeOrderStatus(order): string {
  const at = order.marketName ? ` at ${order.marketName}` : "";
  switch (order.status) {
    case "draft":
      return "Pick up where you left off — list not sent yet";
    case "proposed":
      return "Finding you an agent";
    case "agent_assigned":
      return `Agent assigned${at} — shopping starts soon`;
    case "shopping": {
      const items = order.items || [];
      const bought = items.filter((it) => it.confirmed_price != null).length;
      return `Agent is shopping${at} — ${bought} of ${items.length} bought`;
    }
    case "awaiting_payment":
      return "Shopping done — balance due";
    case "paid":
      return "Packing your order";
    case "packed":
      return "Packed, waiting for pickup";
    case "out_for_delivery":
      return "Out for delivery";
    case "delivered":
    case "closed":
      return "Delivered";
    default:
      return "In progress";
  }
}
