"use client";

import Icon from "./Icon";

// The order flow's progress tracker: List -> Market -> Delivery -> Quote.
// Completed steps are tappable (jump back), the current one is ringed in
// peach, upcoming ones are quiet. Replaces the old row of unlabeled bars,
// which showed how far along you were but never what the steps were.
export const FLOW_STEPS = [
  { key: "list", label: "List" },
  { key: "market", label: "Market" },
  { key: "address", label: "Delivery" },
  { key: "quote", label: "Quote" },
] as const;

export type FlowStepKey = (typeof FLOW_STEPS)[number]["key"];

function FlowSteps({
  current,
  onStepClick,
}: {
  current: FlowStepKey;
  onStepClick?: (key: FlowStepKey) => void;
}) {
  const currentIndex = FLOW_STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center gap-2" aria-label="Order steps">
      {FLOW_STEPS.map((step, i) => {
        const done = i < currentIndex;
        const isCurrent = i === currentIndex;
        const clickable = done && !!onStepClick;
        const dot = (
          <span
            className={
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors " +
              (done
                ? "bg-brand-orange text-[#1A1A1A]"
                : isCurrent
                  ? "border-2 border-brand-orange bg-brand-orange/15 text-brand-orange-dark"
                  : "bg-sunken-2 text-faint")
            }
          >
            {done ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
          </span>
        );
        const label = (
          <span
            className={
              "text-xs font-bold " +
              (isCurrent ? "text-ink" : done ? "text-muted" : "text-faint") +
              (isCurrent ? "" : " hidden sm:inline")
            }
          >
            {step.label}
          </span>
        );
        return (
          <li key={step.key} className={"flex items-center gap-2 " + (i < FLOW_STEPS.length - 1 ? "flex-1" : "")}>
            {clickable ? (
              <button
                type="button"
                onClick={() => onStepClick!(step.key)}
                className="flex items-center gap-2 rounded-full transition hover:opacity-80"
                aria-label={`Back to ${step.label}`}
              >
                {dot}
                {label}
              </button>
            ) : (
              <span className="flex items-center gap-2" aria-current={isCurrent ? "step" : undefined}>
                {dot}
                {label}
              </span>
            )}
            {i < FLOW_STEPS.length - 1 && (
              <span
                className={
                  "h-0.5 flex-1 rounded-full transition-colors duration-300 " +
                  (done ? "bg-brand-orange" : "bg-line-strong")
                }
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default FlowSteps;
