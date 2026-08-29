// Shared "how old / is this stuck" heuristics for the admin Dashboard and
// Orders screens, kept in one place so they always agree with each other.
// Pure functions only, taking `now` as an explicit argument - callers
// compute Date.now() once per fetch (inside an effect/async handler, never
// during render) and pass it in, same discipline as every countdown
// elsewhere in this app (see PackagingPanel.jsx / DeliveryTracking.jsx).

// Placeholder heuristic, not backend-configured: an active order sitting
// this long without moving is worth a human look. An awaiting_payment order
// past its own payment_window_expires_at is always flagged regardless.
const STUCK_AFTER_MS = 2 * 60 * 60 * 1000; // 2 hours

export function isStuckOrder(order, now) {
  if (order.status === "awaiting_payment" && order.payment_window_expires_at) {
    return new Date(order.payment_window_expires_at).getTime() < now;
  }
  return now - new Date(order.created_at).getTime() > STUCK_AFTER_MS;
}

export function formatAge(ms) {
  if (ms < 0) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Below this, a market's pool can't cover much shopping - the "needs a
// top-up soon" line. A flat placeholder, not derived from real spend
// patterns yet.
export const LOW_FLOAT_BALANCE = 20000;

// Fixed status palette for admin charts (dataviz skill) - distinct from any
// categorical series color, never themed, always paired with an icon+label
// (never color alone). Same four roles StatusBadge already uses in spirit
// (good/problem/pending), just the validated chart-safe steps.
export const CHART_STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

// The standard status-critical red above sits too close to Quika's own
// brand orange to reliably tell apart (validate_palette.js: ΔE 7.7 normal-
// vision, below the 15 floor) - this step is validated specifically against
// that orange (ΔE 20.1) for the one chart that puts them side by side (the
// float-balance bars, most of which are the brand hue).
export const CHART_CRITICAL_VS_ORANGE = "#991B1B";

// Chart chrome shared by every admin chart - brand-muted tones instead of
// recharts' generic slate defaults, so the charts read as part of THIS app.
export const CHART_GRID = "#ebe7e0";
export const CHART_AXIS_TEXT = "#8a8178";
