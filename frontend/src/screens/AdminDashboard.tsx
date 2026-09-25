'use client';

import StatTile from "@/components/StatTile";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { api } from "@/lib/api";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import ChartTooltip from "@/components/ChartTooltip";
import { CardSkeleton } from "@/components/Skeleton";
import { isStuckOrder, LOW_FLOAT_BALANCE, CHART_CRITICAL_VS_ORANGE, CHART_GRID, CHART_AXIS_TEXT } from "@/lib/adminUtils";

const ORANGE = "#EE9A5A";

const POLL_MS = 15000;

const NAV_HREF = {
  float: "/admin/float",
  orders: "/admin/orders",
  users: "/admin/users",
  agents: "/admin/agents",
  riders: "/admin/riders",
};

// The operational heartbeat - the screen an admin actually watches. Float
// health first (most prominent, per spec: no shopping happens in a market
// whose pool is empty), then the three "needs a look" counts below it.
function AdminDashboard() {
  const router = useRouter();
  const [markets, setMarkets] = useState<any>(null);
  const [floatByMarket, setFloatByMarket] = useState<any>({});
  const [inFlight, setInFlight] = useState<any>(null);
  const [flagged, setFlagged] = useState<any>(null);
  const [pendingApps, setPendingApps] = useState<any>(null);
  const [error, setError] = useState("");

  function onNavigate(key) {
    router.push(NAV_HREF[key] || "/admin");
  }
  async function refresh() {
    try {
      const [marketList, flight, flag, apps] = await Promise.all([
        api.getAllMarkets(),
        api.getInFlightOrders(),
        api.getFlaggedUsers(),
        api.getAgentApplications("pending"),
      ]);
      const now = Date.now();
      setMarkets(marketList);
      setInFlight({ ...flight, stuck: flight.orders.filter((o) => isStuckOrder(o, now)).length });
      setFlagged(flag);
      setPendingApps(apps);
      setError("");

      const balances = await Promise.all(
        marketList.map((m) => api.floatBalance(m.id).catch(() => ({ balance: null })))
      );
      const map = {};
      marketList.forEach((m, i) => { map[m.id] = balances[i].balance; });
      setFloatByMarket(map);
    } catch (e) {
      setError("Could not load the dashboard. (" + e.message + ")");
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const loading = markets === null;

  return (
    <div>
      <AdminPageHeader icon="chart" section="Overview" title="Dashboard" description="The operational heartbeat — float, orders, and what needs attention.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Orders in flight" value={inFlight ? inFlight.orders.length : "—"} />
          <StatTile label="Stuck orders" value={inFlight ? inFlight.stuck : "—"} />
          <StatTile label="Flagged customers" value={flagged?.users ? flagged.users.length : "—"} />
          <StatTile label="Pending applications" value={pendingApps ? pendingApps.length : "—"} />
        </div>
      </AdminPageHeader>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-lg font-extrabold text-ink">Float health</h2>
          {markets.length === 0 ? (
            <Card className="mb-8 text-muted">No markets yet — add one under Markets.</Card>
          ) : (
            <>
              {/* Summary before detail: the relative-magnitude read (which
                  markets are thin) is faster from one glance at a chart than
                  scanning N separate number cards - the cards right below
                  stay as the click-through detail/action surface. Horizontal
                  bars, not vertical - market names are long ("Shoprite Ikeja
                  City Mall") and would just get truncated/rotated as x-axis
                  ticks. Below-threshold markets get the critical status
                  color instead of the neutral brand hue - color follows the
                  condition, not an arbitrary series. */}
              {(() => {
                const chartData = markets
                  .filter((m) => floatByMarket[m.id] != null)
                  .map((m) => ({
                    name: m.name,
                    balance: Number(floatByMarket[m.id]),
                    low: Number(floatByMarket[m.id]) < LOW_FLOAT_BALANCE,
                  }));
                if (chartData.length === 0) return null;
                return (
                  <Card className="mb-4">
                    <p className="mb-3 font-bold text-ink">Float balance by market</p>
                    <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 44)}>
                      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }} tickFormatter={(v) => `₦${v}`} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "rgba(33,26,20,0.04)" }} content={<ChartTooltip formatter={(v: any) => [`₦${v}`, "balance"]} />} />
                        <Bar dataKey="balance" radius={[0, 4, 4, 0]} maxBarSize={22}>
                          {chartData.map((d) => (
                            <Cell key={d.name} fill={d.low ? CHART_CRITICAL_VS_ORANGE : ORANGE} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                );
              })()}
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {markets.map((m) => {
                const balance = floatByMarket[m.id];
                const low = balance != null && Number(balance) < LOW_FLOAT_BALANCE;
                return (
                  <Card
                    key={m.id}
                    interactive
                    onClick={() => onNavigate("float")}
                    className={low ? "border-2 border-red-400" : "border-2 border-transparent"}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold text-ink">{m.name}</span>
                      {low && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
                          <Icon name="alert" className="h-3.5 w-3.5" /> Low
                        </span>
                      )}
                    </div>
                    <div className={"mt-2 text-2xl font-extrabold " + (low ? "text-red-600" : "text-ink")}>
                      {balance != null ? `₦${balance}` : "—"}
                    </div>
                    <div className="text-sm text-muted">{m.city}, {m.state}</div>
                  </Card>
                );
              })}
              </div>
            </>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card interactive onClick={() => onNavigate("orders")}>
              <div className="mb-1 flex items-center gap-2 text-muted">
                <Icon name="basket" className="h-4 w-4" /> In-flight orders
              </div>
              <div className="text-3xl font-extrabold text-ink">{inFlight.count}</div>
              <div className="mt-2 flex gap-3 text-sm">
                <span className={inFlight.unassigned > 0 ? "font-bold text-amber-700" : "text-faint"}>
                  {inFlight.unassigned} unassigned
                </span>
                <span className={inFlight.stuck > 0 ? "font-bold text-red-600" : "text-faint"}>
                  {inFlight.stuck} stuck
                </span>
              </div>
            </Card>

            <Card interactive onClick={() => onNavigate("users")}>
              <div className="mb-1 flex items-center gap-2 text-muted">
                <Icon name="flag" className="h-4 w-4" /> Flagged users
              </div>
              <div className={"text-3xl font-extrabold " + (flagged.count > 0 ? "text-amber-700" : "text-ink")}>
                {flagged.count}
              </div>
            </Card>

            {([["agents", "agent", "user", "Pending agent applications"], ["riders", "rider", "bike", "Pending rider applications"]] as const).map(([nav, kind, icon, label]) => {
              const count = pendingApps.filter((a) => a.kind === kind).length;
              return (
                <Card key={kind} interactive onClick={() => onNavigate(nav)}>
                  <div className="mb-1 flex items-center gap-2 text-muted">
                    <Icon name={icon} className="h-4 w-4" /> {label}
                  </div>
                  <div className={"text-3xl font-extrabold " + (count > 0 ? "text-brand-orange" : "text-ink")}>
                    {count}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
