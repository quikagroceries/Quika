import { useState, useEffect } from "react";
import { api } from "./api";
import OrderDetail from "./OrderDetail";
import NewOrderFlow from "./NewOrderFlow";
import Settings from "./Settings";
import Wallet from "./Wallet";
import Notifications from "./Notifications";
import AppShell from "./components/AppShell";
import Button from "./components/Button";
import FilterPills from "./components/FilterPills";
import HistoryOrderCard from "./components/HistoryOrderCard";
import EmptyState from "./components/EmptyState";
import Icon from "./components/Icon";
import { CardSkeleton } from "./components/Skeleton";
import { ORDER_FILTERS, filterOrders, isDeletableOrder, isCancellableOrder } from "./orderStatus";

// "Shop" (the market picker -> list -> address -> quote funnel) is the
// customer's home screen, not the order list. There's no separate "Orders"
// tab either - active and past orders both live in History, one unified
// list filtered by status (the task's "Orders are not the home screen -
// they move to History").
const NAV_ITEMS = [
  { key: "shop", label: "Shop", icon: "store" },
  { key: "history", label: "History", icon: "clock" },
  { key: "wallet", label: "Wallet", icon: "wallet" },
  { key: "settings", label: "Settings", icon: "settings" },
];

function CustomerHome({ user, onLogout, onUserUpdated, roleSwitch }) {
  const [orders, setOrders] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [marketsLoading, setMarketsLoading] = useState(true);
  // Lazy init: a Paystack checkout redirect is a full-page round trip (this
  // app has no client-side router), so without this the customer would land
  // back on the plain order list with no memory of which order they were
  // paying for - see OrderDetail's transfer handlers, which set this key
  // right before redirecting.
  const [openOrderId, setOpenOrderId] = useState(() => {
    const pending = localStorage.getItem("quika_pending_order_return");
    if (pending) localStorage.removeItem("quika_pending_order_return");
    return pending;
  });
  const [statusFilter, setStatusFilter] = useState("active");
  const [activeTab, setActiveTab] = useState("shop");   // "shop" | "history" | "wallet"
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  // Shared by both destructive order actions (delete pre-deposit, cancel
  // post-deposit) - same banner spot, no reason for two.
  const [actionError, setActionError] = useState("");

  async function loadOrders() {
    try {
      setOrders(await api.myCustomerOrders());
    } catch (e) {
      setError("Could not load your orders. (" + e.message + ")");
    } finally {
      setLoading(false);
    }
  }

  async function loadMarkets() {
    try {
      setMarkets(await api.getMarkets());
    } catch (e) {
      setError("Could not load markets. (" + e.message + ")");
    } finally {
      setMarketsLoading(false);
    }
  }

  useEffect(() => { loadOrders(); loadMarkets(); }, []);

  const marketName = (id) => markets.find((m) => m.id === id)?.name;

  function handleNavigate(key) {
    setActiveTab(key);
    setOpenOrderId(null); // jumping to a nav tab always leaves any open order
  }

  function handleOrderPlaced(orderId) {
    setOpenOrderId(orderId);
    loadOrders();
  }

  async function handleDelete(orderId) {
    setActionError(""); setDeleting(true);
    try {
      await api.deleteOrder(orderId);
      setConfirmDeleteId(null);
      await loadOrders();
    } catch (e) {
      setActionError("Could not delete: " + e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleCancel(orderId) {
    setActionError(""); setCancelling(true);
    try {
      await api.cancelOrder(orderId);
      setConfirmCancelId(null);
      await loadOrders();
    } catch (e) {
      setActionError("Could not cancel: " + e.message);
    } finally {
      setCancelling(false);
    }
  }

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
      <Notifications />

      {openOrderId ? (
        <OrderDetail
          orderId={openOrderId}
          onBack={() => setOpenOrderId(null)}
          onTopUpWallet={() => { setOpenOrderId(null); setActiveTab("wallet"); }}
        />
      ) : activeTab === "shop" ? (
        <NewOrderFlow
          user={user}
          markets={markets}
          marketsLoading={marketsLoading}
          onCancel={() => setActiveTab("history")}
          onOrderPlaced={handleOrderPlaced}
        />
      ) : activeTab === "wallet" ? (
        <Wallet />
      ) : activeTab === "settings" ? (
        <Settings user={user} onUserUpdated={onUserUpdated} onLogout={onLogout} />
      ) : (
        <div>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">History</h1>
          <p className="mb-6 text-slate-500">Every order you've placed, active or finished.</p>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          {actionError && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>
          )}

          <FilterPills options={ORDER_FILTERS} value={statusFilter} onChange={setStatusFilter} />

          {loading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
            </div>
          )}

          {/* Distinct from "no orders match this filter" - a customer who's
              never placed one shouldn't be told to try a different filter. */}
          {!loading && orders.length === 0 && !error && (
            <EmptyState
              icon="clock"
              title="No orders yet"
              subtitle="Tap Shop to place your first order."
            />
          )}
          {!loading && orders.length > 0 && visibleOrders.length === 0 && !error && (
            <EmptyState
              icon="clock"
              title="No orders match this filter"
              subtitle="Try a different filter, or tap Shop to place a new order."
            />
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {!loading && visibleOrders.map((order) => (
              <HistoryOrderCard
                key={order.id}
                order={order}
                marketName={marketName(order.market_id)}
                counterpartLabel="Agent"
                counterpartId={order.agent_id}
                onClick={() => setOpenOrderId(order.id)}
                footer={isDeletableOrder(order) ? (
                  confirmDeleteId === order.id ? (
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm text-slate-600">Delete this order?</span>
                      <Button
                        variant="neutral"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deleting}
                        className="px-3 text-sm"
                      >
                        Cancel
                      </Button>
                      <button
                        onClick={() => handleDelete(order.id)}
                        disabled={deleting}
                        className="rounded-xl bg-red-600 px-3 min-h-[44px] text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting ? "Deleting…" : "Confirm"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setActionError(""); setConfirmDeleteId(order.id); }}
                      className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-red-600"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                      Delete
                    </button>
                  )
                ) : isCancellableOrder(order) ? (
                  confirmCancelId === order.id ? (
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm text-slate-600">Cancel? Your deposit will be refunded.</span>
                      <Button
                        variant="neutral"
                        onClick={() => setConfirmCancelId(null)}
                        disabled={cancelling}
                        className="px-3 text-sm"
                      >
                        Back
                      </Button>
                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={cancelling}
                        className="rounded-xl bg-red-600 px-3 min-h-[44px] text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                      >
                        {cancelling ? "Cancelling…" : "Confirm"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setActionError(""); setConfirmCancelId(order.id); }}
                      className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-red-600"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                      Cancel order (deposit refunded)
                    </button>
                  )
                ) : null}
              />
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default CustomerHome;
