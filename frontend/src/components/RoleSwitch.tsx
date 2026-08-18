'use client';

// Shown only to vetted agents - lets them flip between their agent view
// (fulfilling orders) and customer view (shopping for themselves), same
// account. Never shown to a plain customer - there's nothing to switch to;
// becoming an agent is the separate vetted signup path, not a toggle.
function RoleSwitch({ mode, onToggle, busy, error, compact = false }: any) {
  const isCustomer = mode === "customer";

  if (compact) {
    // Icon-rail width (md, not yet lg) can't fit two labels - a single
    // button showing the mode you'd switch TO, so it's still reachable at
    // every breakpoint instead of just disappearing.
    return (
      <button
        onClick={() => onToggle(isCustomer ? "agent" : "customer")}
        disabled={busy}
        title={isCustomer ? "Switch to agent view" : "Switch to customer view"}
        aria-label={isCustomer ? "Switch to agent view" : "Switch to customer view"}
        className="flex h-11 w-11 items-center justify-center self-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
      >
        <span className="text-xs font-bold">{isCustomer ? "A" : "C"}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => onToggle(isCustomer ? "agent" : "customer")}
        disabled={busy}
        aria-label={isCustomer ? "Switch to agent view" : "Switch to customer view"}
        className="relative flex h-10 w-full items-center rounded-full bg-slate-100 p-1 text-sm font-semibold transition-opacity disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className={
            "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out " +
            (isCustomer ? "translate-x-[calc(100%+4px)]" : "translate-x-0")
          }
        />
        <span className={"relative z-10 flex-1 text-center " + (!isCustomer ? "text-brand-orange" : "text-slate-500")}>
          Agent
        </span>
        <span className={"relative z-10 flex-1 text-center " + (isCustomer ? "text-brand-orange" : "text-slate-500")}>
          Customer
        </span>
      </button>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default RoleSwitch;
