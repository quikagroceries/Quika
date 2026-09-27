'use client';

import StatTile from "@/components/StatTile";
import FilterPills from "@/components/FilterPills";
import { usePageSearch } from "@/components/PageSearchContext";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { CardSkeleton } from "@/components/Skeleton";
import Input from "@/components/Input";
import StatusBadge from "@/components/StatusBadge";
import { formatAge, isStuckOrder } from "@/lib/adminUtils";
import { marketTone, TONE_COVER } from "@/lib/vendorVisuals";
import { coverImageForMarket } from "@/lib/marketDirectory";
import { summarizeOrderStatus } from "@/lib/orderStatus";

const POLL_MS = 15000;

// Mirrors admin/service.py::admin_cancel_order's own guard exactly - a rider
// already out with the goods (DELIVERED) is past the point of a clean cancel.
const ADMIN_CANCELLABLE = new Set([
  "draft", "proposed", "agent_assigned", "shopping",
  "awaiting_payment", "paid", "packed", "out_for_delivery",
]);

export function OrderDetailPanel({ orderId, markets, agents, onBack, onAssigned }: any) {
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickedAgent, setPickedAgent] = useState("");

  const [cancelling, setCancelling] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelled, setCancelled] = useState(false);

  const [raisingCap, setRaisingCap] = useState(false);
  const [capExtra, setCapExtra] = useState("");
  const [capBusy, setCapBusy] = useState(false);
  const [capError, setCapError] = useState("");
  const [capResult, setCapResult] = useState<any>(null);

  async function refresh() {
    try {
      const o = await api.getOrder(orderId);
      setOrder(o);
      const suggestion = o.paid_at ? o.grand_total : o.deposit_paid_at ? o.deposit_amount : "0.00";
      setRefundAmount((prev) => prev || String(suggestion));
    } catch (e) {
      setError("Could not load this order. (" + e.message + ")");
    }
  }

  async function handleCancel() {
    if (!cancelNote.trim()) return;
    setCancelBusy(true); setCancelError("");
    try {
      await api.adminCancelOrder(orderId, { refund_amount: refundAmount || "0", note: cancelNote.trim() });
      setCancelling(false);
      setCancelled(true);
      await refresh();
      onAssigned?.();
    } catch (e) {
      setCancelError("Could not cancel this order: " + e.message);
    } finally {
      setCancelBusy(false);
    }
  }

  async function handleRaiseCap() {
    if (!capExtra) return;
    setCapBusy(true); setCapError("");
    try {
      setCapResult(await api.adminRaiseCap(orderId, capExtra));
      setRaisingCap(false);
      setCapExtra("");
    } catch (e) {
      setCapError("Could not raise the cap: " + e.message);
    } finally {
      setCapBusy(false);
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

  if (!order) {
    return (
      <div>
        <Button variant="neutral" onClick={onBack} className="mb-4">← Back to orders</Button>
        <CardSkeleton />
      </div>
    );
  }

  // Light tint now, not a dark-ink fallback - cream/white surfaces only,
  // per the app's no-dark-surfaces rule. Text over this hero is dark ink,
  // not white, to match.
  const heroBg = market ? TONE_COVER[marketTone(market.name, market.city)].bg : "#F0ECE0";

  return (
    <div>
      {/* Same hero treatment as the customer-facing order screen (see
          screens/OrderDetail.tsx) - market identity + a live status line,
          not a bare "Order xxx…" line, so an admin looking at one order
          sees the same product the customer/agent see, not a different
          back-office skin bolted on. Back floats over the banner itself
          rather than its own row above it, same reasoning as the customer
          version. */}
      <div
        className="relative mb-4 min-h-[160px] overflow-hidden rounded-2xl shadow-md sm:min-h-[200px]"
        style={{ backgroundColor: heroBg }}
      >
        {market && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[55%]">
            <img
              src={coverImageForMarket(market)}
              alt={market.name}
              className="h-full w-full object-cover object-center"
            />
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(90deg, ${heroBg} 0%, ${heroBg} 12%, ${heroBg}cc 28%, ${heroBg}66 48%, transparent 72%)` }}
            />
            <div
              className="absolute inset-0 sm:hidden"
              style={{ background: `linear-gradient(90deg, ${heroBg} 0%, ${heroBg}e6 35%, ${heroBg}99 55%, transparent 85%)` }}
            />
          </div>
        )}

        <div className="relative z-20 px-4 pt-4 sm:px-5 sm:pt-5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to orders"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            <Icon name="chevronDown" className="h-5 w-5 rotate-90" />
          </button>
        </div>

        <div className="relative z-10 flex w-full flex-col justify-center gap-1.5 px-5 pb-5 pt-3 sm:w-[60%] sm:px-6 sm:pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/55">
              {market?.name || "Order"} · #{order.id.slice(0, 8)}
            </p>
            <StatusBadge status={order.status} />
          </div>
          <h2 className="font-display text-xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-2xl">
            {summarizeOrderStatus({ ...order, marketName: market?.name })}
          </h2>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {/* Same "what's happening" (wide, left) / "manage this order"
          (narrow, right) split as the customer screen - items are the
          status feed here, assignment + the raw record are the admin
          actions/reference. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <Card className="order-2 lg:order-1">
          <p className="mb-2 font-bold text-ink">Items ({(order.items || []).length})</p>
          <div className="space-y-2">
            {(order.items || []).map((it) => (
              <div key={it.id} className="flex items-center justify-between border-b border-line pb-2 text-sm last:border-0">
                <span className="min-w-0 flex-1 truncate text-ink/80">{it.description}</span>
                <span className="shrink-0 font-semibold text-ink">
                  {it.confirmed_price != null ? `₦${it.confirmed_price}` : it.availability}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <div className="order-1 flex flex-col gap-4 lg:order-2">
          {!order.agent_id && (
            <Card className="border-2 border-amber-400">
              <p className="mb-2 font-bold text-ink">Assign an agent</p>
              {marketAgents.length === 0 ? (
                <p className="text-sm text-muted">No agents are registered for this market yet.</p>
              ) : (
                <>
                  <select
                    value={pickedAgent}
                    onChange={(e) => setPickedAgent(e.target.value)}
                    className="mb-2 w-full min-h-[44px] rounded-xl border border-line-strong px-4 text-base text-ink"
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

          {order.status === "shopping" && (
            <Card>
              <p className="mb-2 font-bold text-ink">Spending cap</p>
              {capResult && !raisingCap ? (
                <p className="text-sm text-brand-green">Cap raised — now ₦{capResult.cap} (₦{capResult.spent} spent so far).</p>
              ) : raisingCap ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted">For when the customer approved an overage by phone/chat instead of in-app.</p>
                  <Input placeholder="Raise by (₦)" value={capExtra} onChange={(e) => setCapExtra(e.target.value)} />
                  {capError && <p className="text-sm text-red-600">{capError}</p>}
                  <div className="flex gap-2">
                    <Button variant="neutral" className="flex-1 text-sm" onClick={() => { setRaisingCap(false); setCapError(""); }} disabled={capBusy}>Cancel</Button>
                    <Button className="flex-1 text-sm" onClick={handleRaiseCap} busy={capBusy} disabled={!capExtra}>Confirm</Button>
                  </div>
                </div>
              ) : (
                <Button variant="neutral" onClick={() => setRaisingCap(true)} fullWidth className="text-sm">
                  Raise spending cap
                </Button>
              )}
            </Card>
          )}

          {(ADMIN_CANCELLABLE.has(order.status) || cancelled) && (
            <Card className={cancelling ? "border-2 border-red-300" : ""}>
              <p className="mb-2 font-bold text-ink">Cancel this order</p>
              {cancelled ? (
                <p className="text-sm text-brand-green">Order cancelled and refund sent to the customer&apos;s wallet.</p>
              ) : cancelling ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted">
                    For a stuck or disputed order. Enter what the customer actually paid — deposit and/or full payment — so it&apos;s refunded correctly.
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-ink/70">Refund to wallet (₦)</span>
                    <Input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-ink/70">Reason (required)</span>
                    <Input placeholder="e.g. customer reported it never arrived" value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} />
                  </label>
                  {cancelError && <p className="text-sm text-red-600">{cancelError}</p>}
                  <div className="flex gap-2">
                    <Button variant="neutral" className="flex-1 text-sm" onClick={() => { setCancelling(false); setCancelError(""); }} disabled={cancelBusy}>Back</Button>
                    <Button className="flex-1 !bg-red-600 text-sm hover:!bg-red-700" onClick={handleCancel} busy={cancelBusy} disabled={!cancelNote.trim()}>
                      Confirm cancel &amp; refund
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="neutral" onClick={() => setCancelling(true)} fullWidth className="text-sm !text-red-600">
                  Cancel &amp; refund
                </Button>
              )}
            </Card>
          )}

          <Card>
            <p className="mb-2 font-bold text-ink">Order record</p>
            <div className="space-y-1 text-ink/80">
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
        </div>
      </div>
    </div>
  );
}

function AdminOrders() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [now, setNow] = useState<any>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const search = usePageSearch("Search orders, markets, agents…");

  async function refresh() {
    try {
      const [flight, marketList] = await Promise.all([
        api.getInFlightOrders(),
        api.getAllMarkets(),
      ]);
      setData(flight);
      setMarkets(marketList);
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

  const all: any[] = data?.orders ?? [];
  const unassigned = all.filter((o) => !o.agent_id).length;
  const stuckCount = now != null ? all.filter((o) => isStuckOrder(o, now)).length : 0;
  const shoppingCount = all.filter((o) => o.status === "shopping").length;
  const visible = all.filter((o) => {
    if (filter === "unassigned" && o.agent_id) return false;
    if (filter === "stuck" && !(now != null && isStuckOrder(o, now))) return false;
    if (!search) return true;
    return [o.status, marketName(o.market_id), o.agent_id, o.customer_id, o.id].some((v) =>
      String(v || "").toLowerCase().includes(search)
    );
  });

  return (
    <div>
      <AdminPageHeader icon="basket" section="Operations" title="Orders" description="Every order still in flight — not yet delivered, closed, or cancelled.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="In flight" value={all.length} />
          <StatTile label="Being shopped" value={shoppingCount} />
          <StatTile label="Unassigned" value={unassigned} />
          <StatTile label="Stuck" value={stuckCount} />
        </div>
      </AdminPageHeader>

      {data && all.length > 0 && (
        <FilterPills
          options={[
            { key: "all", label: `All (${all.length})` },
            { key: "unassigned", label: `Unassigned (${unassigned})` },
            { key: "stuck", label: `Stuck (${stuckCount})` },
          ]}
          value={filter}
          onChange={setFilter}
        />
      )}

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {!data ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
      ) : data.orders.length === 0 ? (
        <EmptyState icon="basket" title="Nothing in flight" subtitle="Every order is delivered, closed, or cancelled." />
      ) : visible.length === 0 ? (
        <EmptyState icon="basket" title="No matching orders" subtitle="Try a different filter or search." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-faint">
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Market</th>
                <th className="px-4 py-3 font-semibold">Agent</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Age</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => {
                const stuck = now != null && isStuckOrder(o, now);
                return (
                  <tr
                    key={o.id}
                    onClick={() => router.push(`/admin/orders/${o.id}`)}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-sunken-2"
                  >
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-ink/80">{marketName(o.market_id)}</td>
                    <td className="px-4 py-3">
                      {o.agent_id ? (
                        <span className="text-ink/80">{o.agent_id.slice(0, 8)}…</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{o.customer_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3">
                      <span className={stuck ? "flex items-center gap-1 font-bold text-red-600" : "text-muted"}>
                        {stuck && <Icon name="alert" className="h-3.5 w-3.5" />}
                        {formatAge(now - new Date(o.created_at).getTime())}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-faint">›</td>
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
