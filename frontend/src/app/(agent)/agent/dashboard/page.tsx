"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";

function AvailabilitySwitch({ on, onToggle, busy }: any) {
  return (
    <button
      onClick={() => onToggle(!on)}
      disabled={busy}
      aria-label={on ? "Go unavailable for new orders" : "Go available for new orders"}
      className={"relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 " + (on ? "bg-brand-green" : "bg-slate-300")}
    >
      <span
        className={"absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-150 " + (on ? "translate-x-7" : "translate-x-1")}
      />
    </button>
  );
}

export default function AgentDashboardPage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [summaryError, setSummaryError] = useState("");
  const [availBusy, setAvailBusy] = useState(false);

  useEffect(() => {
    api.getAgentSummary()
      .then(setSummary)
      .catch((e) => setSummaryError("Could not load dashboard. (" + e.message + ")"));
    api.getMarkets().then(setMarkets).catch(() => {});
  }, []);

  async function handleToggleAvailability(next) {
    setSummaryError(""); setAvailBusy(true);
    try {
      setSummary(await api.setAgentAvailability(next));
    } catch (e) {
      setSummaryError("Could not update availability: " + e.message);
    } finally {
      setAvailBusy(false);
    }
  }

  const marketName = (id) => markets.find((m) => m.id === id)?.name;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Dashboard</h1>
      <p className="mb-6 text-slate-500">Your earnings, tasks, and availability.</p>

      {summaryError && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{summaryError}</p>
      )}

      {!summary ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-brand-orange to-brand-orange-dark text-white shadow-none">
              <div className="text-sm text-white/80">Today</div>
              <div className="text-3xl font-bold">₦{summary.earnings_today}</div>
            </Card>
            <Card>
              <div className="text-sm text-slate-500">This week</div>
              <div className="text-3xl font-bold text-slate-900">₦{summary.earnings_week}</div>
            </Card>
            <Card>
              <div className="text-sm text-slate-500">All time</div>
              <div className="text-3xl font-bold text-slate-900">₦{summary.earnings_total}</div>
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <Card className="py-3">
              <div className="text-xl font-extrabold text-slate-900">{summary.ready_to_shop_count}</div>
              <div className="text-xs text-slate-500">Ready to shop</div>
            </Card>
            <Card className="py-3">
              <div className="text-xl font-extrabold text-slate-900">{summary.in_progress_count}</div>
              <div className="text-xs text-slate-500">In progress</div>
            </Card>
          </div>

          <Card className="mt-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900">Available for new orders</p>
              <p className="text-sm text-slate-500">
                Pauses new assignments only — never affects an order you&apos;re already shopping.
              </p>
            </div>
            <AvailabilitySwitch on={summary.is_available} onToggle={handleToggleAvailability} busy={availBusy} />
          </Card>

          <h2 className="mb-3 mt-8 text-lg font-extrabold text-slate-900">Completed orders</h2>
          {summary.completed_orders.length === 0 ? (
            <EmptyState icon="clock" title="No completed orders yet" subtitle="Orders you've been paid for will show up here." />
          ) : (
            <div className="space-y-2">
              {summary.completed_orders.map((o) => (
                <Card key={o.id} interactive onClick={() => router.push(`/agent/orders/${o.id}`)} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{marketName(o.market_id) || "—"}</div>
                    <div className="text-sm text-slate-500">
                      {o.paid_at ? new Date(o.paid_at).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-bold text-brand-green">+₦{o.agent_share}</div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
