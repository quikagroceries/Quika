import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { api } from "./api";
import Card from "./components/Card";
import { CardSkeleton } from "./components/Skeleton";

// Quika brand colors for the primary series; muted/semantic colors for the
// rates breakdown (green=completed, red=cancelled, amber=non-payment,
// slate=disputed) - same semantics StatusBadge already uses app-wide.
const ORANGE = "#E8541E";
const GREEN = "#0E7A3C";
const RATE_COLORS = { completed: "#0E7A3C", cancelled: "#DC2626", cancelled_unpaid: "#D97706", disputed: "#64748B" };

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [markets, setMarkets] = useState([]);
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
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Analytics</h1>
      <p className="mb-6 text-slate-500">Last 30 days, plus lifetime agent/market activity — computed only from what's actually recorded.</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 font-bold text-slate-900">Order volume</p>
          {volume.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No paid orders in the last 30 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} width={30} />
                <Tooltip />
                <Bar dataKey="orders" fill={ORANGE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <p className="mb-3 font-bold text-slate-900">Revenue (company share)</p>
          {revenue.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No paid orders in the last 30 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} width={50} tickFormatter={(v) => `₦${v}`} />
                <Tooltip formatter={(v) => [`₦${v}`, "Company share"]} />
                <Line type="monotone" dataKey="company_share" stroke={GREEN} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <Card>
          <p className="mb-3 font-bold text-slate-900">Agent activity (lifetime)</p>
          {agents.length === 0 ? (
            <p className="text-sm text-slate-400">No agents yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3 font-semibold">Agent</th>
                    <th className="py-2 pr-3 font-semibold">Completed</th>
                    <th className="py-2 font-semibold">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.agent_id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-3 font-semibold text-slate-900">{a.full_name || a.phone}</td>
                      <td className="py-2 pr-3 text-slate-700">{a.completed_orders}</td>
                      <td className="py-2 font-semibold text-slate-900">₦{a.earnings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <p className="mb-3 font-bold text-slate-900">Order outcomes</p>
          {rates.total_terminal === 0 ? (
            <p className="text-sm text-slate-400">No orders have reached a final outcome yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={rateSlices} dataKey="value" nameKey="key" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {rateSlices.map((s) => <Cell key={s.key} fill={RATE_COLORS[s.key]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, rateLabels[n]]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1 text-sm">
                {rateSlices.map((s) => (
                  <div key={s.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RATE_COLORS[s.key] }} />
                      {rateLabels[s.key]}
                    </span>
                    <span className="font-semibold text-slate-900">
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
        <p className="mb-3 font-bold text-slate-900">Market activity (lifetime)</p>
        {marketsSorted.length === 0 ? (
          <p className="text-sm text-slate-400">No paid orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3 font-semibold">Market</th>
                  <th className="py-2 pr-3 font-semibold">Orders</th>
                  <th className="py-2 font-semibold">Float turnover</th>
                </tr>
              </thead>
              <tbody>
                {marketsSorted.map((m) => (
                  <tr key={m.market_id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-3 font-semibold text-slate-900">{marketName(m.market_id)}</td>
                    <td className="py-2 pr-3 text-slate-700">{m.orders}</td>
                    <td className="py-2 font-semibold text-slate-900">₦{m.float_turnover}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminAnalytics;
