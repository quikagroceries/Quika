'use client';

// Color-coded order status pill, reused on every screen that lists or shows
// an order. Semantic mapping per the brand spec: green = success, red =
// errors/problems only, amber = everything still pending/in-progress.

const SUCCESS = new Set(["paid", "delivered", "closed"]);
const PROBLEM = new Set(["cancelled", "cancelled_unpaid", "disputed"]);

function StatusBadge({ status }: any) {
  const problem = PROBLEM.has(status);
  const success = SUCCESS.has(status);
  // Pending/in-progress used raw Tailwind `amber-*` - unrelated to the
  // brand palette, when "in progress" is already peach everywhere else in
  // the app (the header's Active Order pill, the "Order in progress"
  // banner). Swapped to `brand-orange` so this status pill actually reads
  // as the same status language as the rest of the app, not a color that
  // happens to look similar.
  const style = problem
    ? "bg-red-50 text-red-700"
    : success
    ? "bg-brand-green/10 text-brand-green"
    : "bg-brand-orange/15 text-brand-orange-dark";
  const dot = problem ? "bg-red-600" : success ? "bg-brand-green" : "bg-brand-orange";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${style}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {(status || "").replaceAll("_", " ")}
    </span>
  );
}

export default StatusBadge;
