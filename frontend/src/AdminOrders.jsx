import { useEffect, useState } from "react";
import { api } from "./api";
import Button from "./components/Button";
import Card from "./components/Card";
import EmptyState from "./components/EmptyState";
import Icon from "./components/Icon";
import { CardSkeleton } from "./components/Skeleton";
import StatusBadge from "./components/StatusBadge";
import { formatAge, isStuckOrder } from "./adminUtils";

const POLL_MS = 15000;

function OrderDetailPanel({ orderId, markets, agents, onBack, onAssigned }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickedAgent, setPickedAgent] = useState("");

  async function refresh() {
    try {
      setOrder(await api.getOrder(orderId));
    } catch (e) {
      setError("Could not load this order. (" + e.message + ")");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot load per orderId
  }, [orderId]);

  async function handleAssign() {
    if (!pickedAgent) return;
    setError(""); setBusy(true);
    try {
      await api.assignAgent(orderId, pickedAgent);
      await refresh();
      onAssigned?.();
    } catch (e) {
      setError("Could not assign: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  const market = markets.find((m) => m.id === order?.market_id);
  const marketAgents = agents.filter((a) => a.assigned_market_id === order?.market_id);

  return (
    <div>
      <Button variant="neutral" onClick={onBack} className="mb-4">← Back to orders</Button>

      {!order ? (
        <CardSkeleton />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Order {order.id.slice(0, 8)}…</h2>
            <StatusBadge status={order.status} />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <Card>
            <div className="space-y-1 text-slate-700">
              <div className="flex justify-between"><span>Market</span><span className="font-semibold">{market ? `${market.name}, ${market.city}` : order.market_id.slice(0, 8) + "…"}</span></div>
              <div className="flex justify-between"><span>Customer</span><span className="font-semibold">{order.customer_id.slice(0, 8)}…</span></div>
              <div className="flex justify-between"><span>Agent</span><span className="font-semibold">{order.agent_id ? order.agent_id.slice(0, 8) + "…" : "Unassigned"}</span></div>
              <div className="flex justify-between"><span>Created</span><span className="font-semibold">{new Date(order.created_at).toLocaleString()}</span></div>
              {order.grand_total > 0 && (
                <div className="flex justify-between"><span>Grand total</span><span className="font-semibold">₦{order.grand_total}</span></div>
              )}
              {order.courier_reference && (
                <div className="flex justify-between"><span>Courier ref</span><span className="font-semibold">{order.courier_reference}</span></div>
              )}
            </div>
          </Card>

          {!order.agent_id && (
            <Card className="border-2 border-amber-400">
              <p className="mb-2 font-bold text-slate-900">Assign an agent</p>
              {marketAgents.length === 0 ? (
                <p className="text-sm text-slate-500">No agents are registered for this market yet.</p>
              ) : (
                <>
                  <select
                    value={pickedAgent}
                    onChange={(e) => setPickedAgent(e.target.value)}
                    className="mb-2 w-full min-h-[44px] rounded-xl border border-slate-300 px-4 text-base text-slate-900"
                  >
                    <option value="">Select an agent…</option>
                    {marketAgents.map((a) => (
                      <option key={a.user_id} value={a.user_id}>
                        {a.full_name || a.phone} {a.is_available ? "" : "(busy)"}
                      </option>
                    ))}
                  </select>
                  <Button onClick={handleAssign} busy={busy} disabled={!pickedAgent} fullWidth>
                    Assign
                  </Button>
                </>
              )}
            </Card>
          )}

          <Card>
            <p className="mb-2 font-bold text-slate-900">Items ({(order.items || []).length})</p>
            <div className="space-y-2">
              {(order.items || []).map((it) => (
                <div key={it.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm last:border-0">
                  <span className="min-w-0 flex-1 truncate text-slate-700">{it.description}</span>
                  <span className="shrink-0 font-semibold text-slate-900">
                    {it.confirmed_price != null ? `₦${it.confirmed_price}` : it.availability}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function AdminOrders({ openOrderId, onOpenOrder }) {
  const [data, setData] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [now, setNow] = useState(null);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [flight, marketList, agentList] = await Promise.all([
        api.getInFlightOrders(),
        api.getAllMarkets(),
        api.listAgents(),
      ]);
      setData(flight);
      setMarkets(marketList);
      setAgents(agentList);
      setNow(Date.now());
      setError("");
    } catch (e) {
      setError("Could not load orders. (" + e.message + ")");
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const marketName = (id) => markets.find((m) => m.id === id)?.name || id.slice(0, 8) + "…";

  if (openOrderId) {
    return (
      <OrderDetailPanel
        orderId={openOrderId}
        markets={markets}
        agents={agents}
        onBack={() => onOpenOrder(null)}
        onAssigned={refresh}
      />
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Orders</h1>
      <p className="mb-6 text-slate-500">Every order still in flight — not yet delivered, closed, or cancelled.</p>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {!data ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
      ) : data.orders.length === 0 ? (
        <EmptyState icon="basket" title="Nothing in flight" subtitle="Every order is delivered, closed, or cancelled." />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Market</th>
                <th className="px-4 py-3 font-semibold">Agent</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Age</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => {
                const stuck = now != null && isStuckOrder(o, now);
                return (
                  <tr
                    key={o.id}
                    onClick={() => onOpenOrder(o.id)}
                    className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-slate-700">{marketName(o.market_id)}</td>
                    <td className="px-4 py-3">
                      {o.agent_id ? (
                        <span className="text-slate-700">{o.agent_id.slice(0, 8)}…</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{o.customer_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3">
                      <span className={stuck ? "flex items-center gap-1 font-bold text-red-600" : "text-slate-500"}>
                        {stuck && <Icon name="alert" className="h-3.5 w-3.5" />}
                        {formatAge(now - new Date(o.created_at).getTime())}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">›</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminOrders;
