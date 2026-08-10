import { useState, useEffect } from "react";
import { api } from "./api";
import Shopping from "./Shopping";
import Settings from "./Settings";
import AppShell from "./components/AppShell";
import Card from "./components/Card";
import StatusBadge from "./components/StatusBadge";
import EmptyState from "./components/EmptyState";
import FilterPills from "./components/FilterPills";
import HistoryOrderCard from "./components/HistoryOrderCard";
import { CardSkeleton } from "./components/Skeleton";
import { ORDER_FILTERS, filterOrders } from "./orderStatus";

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: "basket" },
  { key: "history", label: "History", icon: "clock" },
  { key: "dashboard", label: "Dashboard", icon: "wallet" },
  { key: "settings", label: "Settings", icon: "settings" },
];

// The two buckets Home groups its task list into, by urgency: ready to shop
// (top) -> in progress. Mirrors the same grouping app/agent/service.py's
// get_summary uses for its task counts. No "waiting on customer" bucket:
// the deposit-before-assignment gate (orders.service.accept_proposal) means
// an agent is never assigned to an order with an unpaid deposit in the
// first place - every agent_assigned order is already ready to shop.
function isReadyToShop(o) {
  return o.status === "agent_assigned";
}
function isInProgress(o) {
  return o.status === "shopping";
}
// Phase 5: the balance window lapsed - the deposit was forfeited (never
// refunded, see payments.service.expire_stale_orders) and there's no
// packaging/courier for an unpaid order. The one thing left for the agent
// to do is return whatever was already bought.
function isNeedsAttention(o) {
  return o.status === "cancelled_unpaid";
}

const TONE_STYLES = {
  ready: "border-brand-orange",
  progress: "border-brand-green",
  attention: "border-red-400",
};

// Big tap target, high contrast - action-first, per the market-floor use case.
// Deliberately no order total here - the customer's goods estimate/grand
// total is never shown on the agent side (see Shopping.jsx's spending
// authorization card for the agent's actual working limit instead).
function TaskCard({ order, marketName, onClick, tone }) {
  return (
    <Card interactive onClick={onClick} className={"border-2 " + TONE_STYLES[tone]}>
      <div className="flex items-center justify-between">
        <StatusBadge status={order.status} />
        <span className="text-xs text-slate-400">Order {order.id.slice(0, 8)}…</span>
      </div>
      <div className="mt-3 text-slate-500">
        {order.items ? order.items.length : 0} item{order.items && order.items.length === 1 ? "" : "s"}
      </div>
      <div className="mt-1 text-base font-semibold text-slate-700">{marketName || "—"}</div>
      {tone === "attention" && (
        <div className="mt-2 text-sm font-semibold text-red-600">
          Balance wasn't paid — please return these goods to the market/vendor.
        </div>
      )}
    </Card>
  );
}

function TaskSection({ title, subtitle, orders, tone, marketName, onOpen }) {
  if (orders.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="mb-1 text-lg font-extrabold text-slate-900">{title}</h2>
      <p className="mb-3 text-sm text-slate-500">{subtitle}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <TaskCard key={o.id} order={o} tone={tone} marketName={marketName(o.market_id)} onClick={() => onOpen(o.id)} />
        ))}
      </div>
    </div>
  );
}

// Sliding on/off switch for the availability toggle - a plain boolean, not
// the agent/customer two-mode RoleSwitch, so it gets its own small control.
function AvailabilitySwitch({ on, onToggle, busy }) {
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

function Orders({ user, onLogout, onUserUpdated, roleSwitch }) {
  const [orders, setOrders] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [openOrderId, setOpenOrderId] = useState(null);
  const [activeTab, setActiveTab] = useState("home"); // "home" | "history" | "dashboard"
  const [statusFilter, setStatusFilter] = useState("active");

  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [availBusy, setAvailBusy] = useState(false);

  async function refreshAll() {
    async function load() {
      try {
        setOrders(await api.myOrders());
      } catch (err) {
        if (String(err.message).startsWith("401")) { onLogout(); return; }
        setError("Could not load your tasks. (" + err.message + ")");
      } finally {
        setLoading(false);
      }
    }
    async function loadSummary() {
      try {
        setSummary(await api.getAgentSummary());
      } catch (e) {
        setSummaryError("Could not load dashboard. (" + e.message + ")");
      }
    }
    load();
    loadSummary();
    api.getMarkets().then(setMarkets).catch(() => {});
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot load on mount, matches the rest of this file's pattern
  }, [onLogout]);

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

  function handleNavigate(key) {
    setActiveTab(key);
    setOpenOrderId(null);
  }

  function handleBackFromOrder() {
    setOpenOrderId(null);
    refreshAll(); // task counts / earnings may have changed
  }

  const actionable = orders.filter((o) => o.status === "agent_assigned" || o.status === "shopping");
  const readyToShop = actionable.filter(isReadyToShop);
  const inProgress = actionable.filter(isInProgress);
  const needsAttention = orders.filter(isNeedsAttention);
  const noTasks = !loading && actionable.length === 0 && needsAttention.length === 0;
  const visibleOrders = filterOrders(orders, statusFilter);

  return (
    <AppShell
      navItems={NAV_ITEMS}
      activeKey={openOrderId ? null : activeTab}
      onNavigate={handleNavigate}
      user={user}
      onLogout={onLogout}
      roleSwitch={roleSwitch}
    >
      {openOrderId ? (
        <Shopping orderId={openOrderId} onBack={handleBackFromOrder} />
      ) : activeTab === "history" ? (
        <div>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">History</h1>
          <p className="mb-6 text-slate-500">Every order you've shopped, active or finished.</p>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <FilterPills options={ORDER_FILTERS} value={statusFilter} onChange={setStatusFilter} />

          {loading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
            </div>
          )}

          {!loading && visibleOrders.length === 0 && !error && (
            <EmptyState
              icon="clock"
              title="No orders match this filter"
              subtitle="Try a different filter — new assignments show up under Home."
            />
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {!loading && visibleOrders.map((order) => (
              <HistoryOrderCard
                key={order.id}
                order={order}
                marketName={marketName(order.market_id)}
                counterpartLabel="Customer"
                counterpartId={order.customer_id}
                onClick={() => setOpenOrderId(order.id)}
                hideTotal
              />
            ))}
          </div>
        </div>
      ) : activeTab === "dashboard" ? (
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
                    Pauses new assignments only — never affects an order you're already shopping.
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
                    <Card key={o.id} interactive onClick={() => setOpenOrderId(o.id)} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{marketName(o.market_id) || "—"}</div>
                        <div className="text-sm text-slate-500">
                          {o.paid_at ? new Date(o.paid_at).toLocaleDateString() : "—"}
                        </div>
                      </div>
                      {/* Only the agent's own earnings - never the order's
                          grand total, which would reveal the customer's
                          overall spend. */}
                      <div className="shrink-0 text-right font-bold text-brand-green">+₦{o.agent_share}</div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : activeTab === "settings" ? (
        <Settings user={user} onUserUpdated={onUserUpdated} onLogout={onLogout} />
      ) : (
        <div>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Home</h1>
          <p className="mb-6 text-slate-500">Your tasks, most urgent first.</p>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {loading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
            </div>
          )}

          {noTasks && !error && (
            <EmptyState icon="basket" title="No tasks right now" subtitle="New assignments will show up here." />
          )}

          <TaskSection
            title="Needs attention"
            subtitle="The customer didn't pay the balance in time — the deposit is forfeited. Return the goods you already bought."
            orders={needsAttention}
            tone="attention"
            marketName={marketName}
            onOpen={setOpenOrderId}
          />
          <TaskSection
            title="Ready to shop"
            subtitle="Start shopping now."
            orders={readyToShop}
            tone="ready"
            marketName={marketName}
            onOpen={setOpenOrderId}
          />
          <TaskSection
            title="In progress"
            subtitle="You're actively shopping these."
            orders={inProgress}
            tone="progress"
            marketName={marketName}
            onOpen={setOpenOrderId}
          />
        </div>
      )}
    </AppShell>
  );
}

export default Orders;
