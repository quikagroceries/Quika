"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import FilterPills from "@/components/FilterPills";
import HistoryOrderCard from "@/components/HistoryOrderCard";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { CardSkeleton } from "@/components/Skeleton";
import { ActiveOrderBanner } from "@/components/ActiveOrderBanner";
import { ORDER_FILTERS, filterOrders, isDeletableOrder, isCancellableOrder } from "@/lib/orderStatus";

export default function HistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [confirmDeleteId, setConfirmDeleteId] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
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

  useEffect(() => {
    loadOrders();
    api.getMarkets().then(setMarkets).catch(() => {});
  }, []);

  const marketFor = (id) => markets.find((m) => m.id === id);
  const visibleOrders = filterOrders(orders, statusFilter);

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

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">History</h1>
          <p className="mt-1 text-[#6b635a]">Every order you&apos;ve placed, active or finished.</p>
        </div>
        <ActiveOrderBanner />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {actionError && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>
      )}

      <FilterPills options={ORDER_FILTERS} value={statusFilter} onChange={setStatusFilter} />

      {loading && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {!loading && orders.length === 0 && !error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <EmptyState
            icon="clock"
            title="No orders yet"
            subtitle="Once you place an order, it'll show up here."
          />
          <Button onClick={() => router.push("/shop")}>Start shopping</Button>
        </div>
      )}
      {!loading && orders.length > 0 && visibleOrders.length === 0 && !error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <EmptyState
            icon="clock"
            title="No orders match this filter"
            subtitle="Try a different filter, or place a new order."
          />
          <Button onClick={() => router.push("/shop")}>Start shopping</Button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!loading && visibleOrders.map((order) => (
          <HistoryOrderCard
            key={order.id}
            order={order}
            market={marketFor(order.market_id)}
            counterpartLabel="Agent"
            counterpartId={order.agent_id}
            onClick={() => router.push(`/orders/${order.id}`)}
            footer={isDeletableOrder(order) ? (
              confirmDeleteId === order.id ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-[#6b635a]">Delete this order?</span>
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
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#8a8178] hover:text-red-600"
                >
                  <Icon name="trash" className="h-4 w-4" />
                  Delete
                </button>
              )
            ) : isCancellableOrder(order) ? (
              confirmCancelId === order.id ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-[#6b635a]">Cancel? Your deposit will be refunded.</span>
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
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#8a8178] hover:text-red-600"
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
  );
}
