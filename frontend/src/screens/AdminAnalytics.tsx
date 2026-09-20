'use client';

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { api } from "@/lib/api";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import ChartTooltip from "@/components/ChartTooltip";
import { CardSkeleton } from "@/components/Skeleton";
import { CHART_STATUS, CHART_GRID, CHART_AXIS_TEXT } from "@/lib/adminUtils";

// Qyka's own brand hues for the two single-series charts (order volume,
// revenue) - a single series carries its identity in the card title, so it
// needs no categorical assignment, just the brand's own hue. The rates
// breakdown below is genuinely status data (completed/cancelled/non-payment/
// disputed), so it uses the fixed, validated status palette instead - never
// color alone, always paired with an icon + label.
const ORANGE = "#E8541E";
const GREEN = "#0E7A3C";
const RATE_STYLE = {
  completed: { color: CHART_STATUS.good, icon: "check" as const },
  cancelled: { color: CHART_STATUS.critical, icon: "close" as const },
  cancelled_unpaid: { color: CHART_STATUS.warning, icon: "clock" as const },
  disputed: { color: CHART_STATUS.serious, icon: "alert" as const },
};

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getAnalytics(30).then(setData).catch((e) => setError("Could not load analytics. (" + e.message + ")"));
    api.getAllMarkets().then(setMarkets).catch(() => {});
  }, []);

  const marketName = (id) => markets.find((m) => m.id === id)?.name || id.slice(0, 8) + "…";

  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!data) {
    return (
      <div className="space-y-4">
        <CardSkeleton /><CardSkeleton />
      </div>
    );
  }

  const volume = data.volume_by_day.map((d) => ({ ...d, label: formatShortDate(d.date) }));
  const revenue = data.revenue_by_day.map((d) => ({ ...d, label: formatShortDate(d.date), company_share: Number(d.company_share) }));
  const agents = [...data.agent_activity].sort((a, b) => Number(b.earnings) - Number(a.earnings));
  const marketsSorted = [...data.market_activity].sort((a, b) => b.orders - a.orders);
  const rates = data.rates;
  const rateSlices = ["completed", "cancelled", "cancelled_unpaid", "disputed"]
    .map((key) => ({ key, value: rates[key] }))
    .filter((s) => s.value > 0);
  const rateLabels = { completed: "Completed", cancelled: "Cancelled", cancelled_unpaid: "Non-payment", disputed: "Disputed" };

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Analytics</h1>
      <p className="mb-6 text-muted">Last 30 days, plus lifetime agent/market activity — computed only from what's actually recorded.</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 font-bold text-ink">Order volume</p>
          {volume.length === 0 ? (
            <p className="py-8 text-center text-sm text-faint">No paid orders in the last 30 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volume}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }} width={30} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(33,26,20,0.04)" }} content={<ChartTooltip formatter={(v: any) => [v, "orders"]} />} />
                <Bar dataKey="orders" fill={ORANGE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <p className="mb-3 font-bold text-ink">Revenue (company share)</p>
          {revenue.length === 0 ? (
            <p className="py-8 text-center text-sm text-faint">No paid orders in the last 30 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }} width={50} tickFormatter={(v) => `₦${v}`} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip formatter={(v: any) => [`₦${v}`, "company share"]} />} />
                <Line type="monotone" dataKey="company_share" stroke={GREEN} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <Card>
          <p className="mb-3 font-bold text-ink">Agent activity (lifetime)</p>
          {agents.length === 0 ? (
            <p className="text-sm text-faint">No agents yet.</p>
          ) : (
            <>
              {/* Summary before detail: a ranking (who earned the most) is
                  a magnitude-by-category job - a horizontal bar leaderboard
                  reads faster than scanning a sorted table column. Capped
                  at the top 8 - past that a bar chart of names just becomes
                  a long scrollable list with extra pixels, no faster than
                  the table already below it; the full table stays the
                  complete record regardless of agent count. */}
              <ResponsiveContainer width="100%" height={Math.max(100, Math.min(agents.length, 8) * 36)}>
                <BarChart data={agents.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }} tickFormatter={(v) => `₦${v}`} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey={(a: any) => a.full_name || a.phone}
                    width={110}
                    tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ fill: "rgba(33,26,20,0.04)" }} content={<ChartTooltip formatter={(v: any) => [`₦${v}`, "earnings"]} />} />
                  <Bar dataKey="earnings" fill={GREEN} radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
              {agents.length > 8 && (
                <p className="mb-3 mt-1 text-xs text-faint">Top 8 of {agents.length} agents shown — full list below.</p>
              )}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-faint">
                    <th className="py-2 pr-3 font-semibold">Agent</th>
                    <th className="py-2 pr-3 font-semibold">Completed</th>
                    <th className="py-2 font-semibold">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.agent_id} className="border-b border-line last:border-0">
                      <td className="py-2 pr-3 font-semibold text-ink">{a.full_name || a.phone}</td>
                      <td className="py-2 pr-3 text-ink/80">{a.completed_orders}</td>
                      <td className="py-2 font-semibold text-ink">₦{a.earnings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Card>

        <Card>
          <p className="mb-3 font-bold text-ink">Order outcomes</p>
          {rates.total_terminal === 0 ? (
            <p className="text-sm text-faint">No orders have reached a final outcome yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={rateSlices} dataKey="value" nameKey="key" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {rateSlices.map((s) => <Cell key={s.key} fill={RATE_STYLE[s.key].color} stroke="#fff" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v: any, n: any) => [v, rateLabels[n]]} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1 text-sm">
                {rateSlices.map((s) => (
                  <div key={s.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <span className="shrink-0" style={{ color: RATE_STYLE[s.key].color }}>
                        <Icon name={RATE_STYLE[s.key].icon} className="h-3.5 w-3.5" />
                      </span>
                      {rateLabels[s.key]}
                    </span>
                    <span className="font-semibold text-ink">
                      {s.value} ({Math.round((s.value / rates.total_terminal) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <p className="mb-3 font-bold text-ink">Market activity (lifetime)</p>
        {marketsSorted.length === 0 ? (
          <p className="text-sm text-faint">No paid orders yet.</p>
        ) : (
          <>
            {/* Orders-by-market only, not float turnover alongside it in the
                same chart - those are two different units (count vs.
                currency) for the same categories, and a dual-axis chart is
                the #1 dataviz mistake precisely because it invites reading
                one bar's height against the wrong scale. Turnover stays a
                table column instead. */}
            <ResponsiveContainer width="100%" height={Math.max(100, Math.min(marketsSorted.length, 8) * 36)}>
              <BarChart data={marketsSorted.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey={(m: any) => marketName(m.market_id)}
                  width={140}
                  tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: "rgba(33,26,20,0.04)" }} content={<ChartTooltip formatter={(v: any) => [v, "orders"]} />} />
                <Bar dataKey="orders" fill={ORANGE} radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
            {marketsSorted.length > 8 && (
              <p className="mb-3 mt-1 text-xs text-faint">Top 8 of {marketsSorted.length} markets shown — full list below.</p>
            )}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-faint">
                  <th className="py-2 pr-3 font-semibold">Market</th>
                  <th className="py-2 pr-3 font-semibold">Orders</th>
                  <th className="py-2 font-semibold">Float turnover</th>
                </tr>
              </thead>
              <tbody>
                {marketsSorted.map((m) => (
                  <tr key={m.market_id} className="border-b border-line last:border-0">
                    <td className="py-2 pr-3 font-semibold text-ink">{marketName(m.market_id)}</td>
                    <td className="py-2 pr-3 text-ink/80">{m.orders}</td>
                    <td className="py-2 font-semibold text-ink">₦{m.float_turnover}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default AdminAnalytics;
