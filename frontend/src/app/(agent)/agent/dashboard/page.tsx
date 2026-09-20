"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { api } from "@/lib/api";
import Card from "@/components/Card";
import HeroBanner from "@/components/HeroBanner";
import SectionHeader from "@/components/SectionHeader";
import StatTile from "@/components/StatTile";
import wallet from "@/assets/illustrations/scene-agent-laptop-delivery.png";
import EmptyState from "@/components/EmptyState";
import ChartTooltip from "@/components/ChartTooltip";
import { CardSkeleton } from "@/components/Skeleton";
import { CHART_GRID, CHART_AXIS_TEXT } from "@/lib/adminUtils";

const ORANGE = "#EE9A5A";

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
      <HeroBanner
        eyebrow="Earnings"
        title={summary ? `₦${summary.earnings_today} earned today.` : "Your earnings"}
        body="Your earnings, tasks and availability, all in one place."
        illustration={wallet}
        illustrationAlt="Agent earnings"
        actions={
          summary ? (
            <div className="flex items-center gap-3 rounded-2xl bg-sunken-2/70 px-4 py-2">
              <div>
                <p className="text-sm font-bold text-ink">Available for new orders</p>
                <p className="text-xs text-muted">Pauses new assignments only.</p>
              </div>
              <AvailabilitySwitch on={summary.is_available} onToggle={handleToggleAvailability} busy={availBusy} />
            </div>
          ) : undefined
        }
      >
        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="This week" value={`₦${summary.earnings_week}`} tone="green" />
            <StatTile label="All time" value={`₦${summary.earnings_total}`} tone="green" />
            <StatTile label="Ready to shop" value={summary.ready_to_shop_count} />
            <StatTile label="In progress" value={summary.in_progress_count} />
          </div>
        )}
      </HeroBanner>

      {summaryError && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{summaryError}</p>
      )}

      {!summary ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          {/* Real trend, not decoration - the same 14 completed_orders the
              list below renders, just bucketed by paid_at day instead of
              listed one row per order. */}
          {summary.completed_orders.length > 0 && (() => {
            const days = last14DaysEarnings(summary.completed_orders);
            const hasAny = days.some((d) => d.earnings > 0);
            if (!hasAny) return null;
            return (
              <Card className="mt-4">
                <SectionHeader icon="chart" title="Earnings, last 14 days" className="mb-3" />
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

          <SectionHeader icon="check" title="Completed orders" subtitle="Paid runs and what you earned." className="mb-3 mt-8" />
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
