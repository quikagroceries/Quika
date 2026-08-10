import { useEffect, useState } from "react";
import { api } from "./api";
import Card from "./components/Card";
import Icon from "./components/Icon";
import { CardSkeleton } from "./components/Skeleton";
import { isStuckOrder, LOW_FLOAT_BALANCE } from "./adminUtils";

const POLL_MS = 15000;

// The operational heartbeat - the screen an admin actually watches. Float
// health first (most prominent, per spec: no shopping happens in a market
// whose pool is empty), then the three "needs a look" counts below it.
function AdminDashboard({ onNavigate }) {
  const [markets, setMarkets] = useState(null);
  const [floatByMarket, setFloatByMarket] = useState({});
  const [inFlight, setInFlight] = useState(null);
  const [flagged, setFlagged] = useState(null);
  const [pendingApps, setPendingApps] = useState(null);
  const [error, setError] = useState("");

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
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Dashboard</h1>
      <p className="mb-6 text-slate-500">The operational heartbeat — float, orders, and what needs attention.</p>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-lg font-extrabold text-slate-900">Float health</h2>
          {markets.length === 0 ? (
            <Card className="mb-8 text-slate-500">No markets yet — add one under Markets.</Card>
          ) : (
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
                      <span className="truncate font-bold text-slate-900">{m.name}</span>
                      {low && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
                          <Icon name="alert" className="h-3.5 w-3.5" /> Low
                        </span>
                      )}
                    </div>
                    <div className={"mt-2 text-2xl font-extrabold " + (low ? "text-red-600" : "text-slate-900")}>
                      {balance != null ? `₦${balance}` : "—"}
                    </div>
                    <div className="text-sm text-slate-500">{m.city}, {m.state}</div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card interactive onClick={() => onNavigate("orders")}>
              <div className="mb-1 flex items-center gap-2 text-slate-500">
                <Icon name="basket" className="h-4 w-4" /> In-flight orders
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{inFlight.count}</div>
              <div className="mt-2 flex gap-3 text-sm">
                <span className={inFlight.unassigned > 0 ? "font-bold text-amber-700" : "text-slate-400"}>
                  {inFlight.unassigned} unassigned
                </span>
                <span className={inFlight.stuck > 0 ? "font-bold text-red-600" : "text-slate-400"}>
                  {inFlight.stuck} stuck
                </span>
              </div>
            </Card>

            <Card interactive onClick={() => onNavigate("users")}>
              <div className="mb-1 flex items-center gap-2 text-slate-500">
                <Icon name="flag" className="h-4 w-4" /> Flagged users
              </div>
              <div className={"text-3xl font-extrabold " + (flagged.count > 0 ? "text-amber-700" : "text-slate-900")}>
                {flagged.count}
              </div>
            </Card>

            <Card interactive onClick={() => onNavigate("agents")}>
              <div className="mb-1 flex items-center gap-2 text-slate-500">
                <Icon name="user" className="h-4 w-4" /> Pending agent applications
              </div>
              <div className={"text-3xl font-extrabold " + (pendingApps.length > 0 ? "text-brand-orange" : "text-slate-900")}>
                {pendingApps.length}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
