"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { api } from "@/lib/api";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import ChartTooltip from "@/components/ChartTooltip";
import { CardSkeleton } from "@/components/Skeleton";
import { CHART_GRID, CHART_AXIS_TEXT } from "@/lib/adminUtils";

const ORANGE = "#E8541E";

// Real data, not a fabricated stat: the last 14 days' earnings, bucketed
// from the same completed_orders list the card list below already renders -
// no separate endpoint, just a different view of what's already fetched.
function last14DaysEarnings(completedOrders: any[]) {
  const days: { date: Date; label: string; earnings: number }[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ date: d, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), earnings: 0 });
  }
  for (const o of completedOrders) {
    if (!o.paid_at) continue;
    const paid = new Date(o.paid_at);
    const bucket = days.find((d) => d.date.toDateString() === paid.toDateString());
    if (bucket) bucket.earnings += Number(o.agent_share) || 0;
  }
  return days;
}

function AvailabilitySwitch({ on, onToggle, busy }: any) {
  return (
    <button
      onClick={() => onToggle(!on)}
      disabled={busy}
      aria-label={on ? "Go unavailable for new orders" : "Go available for new orders"}
      className={"relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 " + (on ? "bg-brand-green" : "bg-line-strong")}
    >
      <span
        className={"absolute top-1 h-6 w-6 rounded-full bg-surface shadow-sm transition-transform duration-150 " + (on ? "translate-x-7" : "translate-x-1")}
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
      <h1 className="mb-1 font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Dashboard</h1>
      <p className="mb-6 text-muted">Your earnings, tasks, and availability.</p>

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
            {/* Same premium "money card" language as the customer Wallet
                card (grain texture + soft glow) instead of a flat gradient
                box - this is the same kind of figure (a balance an agent
                actually cares about), so it gets the same treatment. */}
            <Card className="market-grain panel-orange-rich relative overflow-hidden text-white shadow-md">
              <span className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
              <div className="relative text-sm font-semibold text-white/80">Today</div>
              <div className="relative font-display text-3xl font-extrabold tabular-nums">₦{summary.earnings_today}</div>
            </Card>
            <Card>
              <div className="text-sm text-muted">This week</div>
              <div className="text-3xl font-bold text-ink">₦{summary.earnings_week}</div>
            </Card>
            <Card>
              <div className="text-sm text-muted">All time</div>
              <div className="text-3xl font-bold text-ink">₦{summary.earnings_total}</div>
            </Card>
          </div>

          {/* Real trend, not decoration - the same 14 completed_orders the
              list below renders, just bucketed by paid_at day instead of
              listed one row per order. */}
          {summary.completed_orders.length > 0 && (() => {
            const days = last14DaysEarnings(summary.completed_orders);
            const hasAny = days.some((d) => d.earnings > 0);
            if (!hasAny) return null;
            return (
              <Card className="mt-4">
                <p className="mb-3 font-bold text-ink">Earnings, last 14 days</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={days}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={{ stroke: CHART_GRID }} tickLine={false} interval={1} />
                    <YAxis tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }} width={50} tickFormatter={(v) => `₦${v}`} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(33,26,20,0.04)" }} content={<ChartTooltip formatter={(v: any) => [`₦${v}`, "earned"]} />} />
                    <Bar dataKey="earnings" fill={ORANGE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            );
          })()}

          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <Card className="py-3">
              <div className="text-xl font-extrabold text-ink">{summary.ready_to_shop_count}</div>
              <div className="text-xs text-muted">Ready to shop</div>
            </Card>
            <Card className="py-3">
              <div className="text-xl font-extrabold text-ink">{summary.in_progress_count}</div>
              <div className="text-xs text-muted">In progress</div>
            </Card>
          </div>

          <Card className="mt-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-ink">Available for new orders</p>
              <p className="text-sm text-muted">
                Pauses new assignments only — never affects an order you&apos;re already shopping.
              </p>
            </div>
            <AvailabilitySwitch on={summary.is_available} onToggle={handleToggleAvailability} busy={availBusy} />
          </Card>

          <h2 className="mb-3 mt-8 text-lg font-extrabold text-ink">Completed orders</h2>
          {summary.completed_orders.length === 0 ? (
            <EmptyState icon="clock" title="No completed orders yet" subtitle="Orders you've been paid for will show up here." />
          ) : (
            <div className="space-y-2">
              {summary.completed_orders.map((o) => (
                <Card key={o.id} interactive onClick={() => router.push(`/agent/orders/${o.id}`)} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{marketName(o.market_id) || "—"}</div>
                    <div className="text-sm text-muted">
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
