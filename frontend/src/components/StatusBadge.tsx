'use client';

// Color-coded order status pill, reused on every screen that lists or shows
// an order. Semantic mapping per the brand spec: green = success, red =
// errors/problems only, amber = everything still pending/in-progress.

const SUCCESS = new Set(["paid", "delivered", "closed"]);
const PROBLEM = new Set(["cancelled", "cancelled_unpaid", "disputed"]);

function StatusBadge({ status }: any) {
  const style = PROBLEM.has(status)
    ? "bg-red-50 text-red-700"
    : SUCCESS.has(status)
    ? "bg-brand-green/10 text-brand-green"
    : "bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style}`}>
      {(status || "").replaceAll("_", " ")}
    </span>
  );
}

export default StatusBadge;
