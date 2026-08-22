"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import EmptyState from "@/components/EmptyState";
import FilterPills from "@/components/FilterPills";
import HistoryOrderCard from "@/components/HistoryOrderCard";
import { CardSkeleton } from "@/components/Skeleton";
import { ORDER_FILTERS, filterOrders } from "@/lib/orderStatus";
import { useAuth } from "@/components/AuthProvider";

export default function AgentHistoryPage() {
  const router = useRouter();
  const { handleLogout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");

  useEffect(() => {
    async function load() {
      try {
        setOrders(await api.myOrders());
      } catch (err) {
        if (String(err.message).startsWith("401")) { handleLogout(); return; }
        setError("Could not load your tasks. (" + err.message + ")");
      } finally {
        setLoading(false);
      }
    }
    load();
    api.getMarkets().then(setMarkets).catch(() => {});
  }, [handleLogout]);

  const marketFor = (id) => markets.find((m) => m.id === id);
  const visibleOrders = filterOrders(orders, statusFilter);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">History</h1>
      <p className="mb-6 text-[#6b635a]">Every order you&apos;ve shopped, active or finished.</p>

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
            market={marketFor(order.market_id)}
            counterpartLabel="Customer"
            counterpartId={order.customer_id}
            onClick={() => router.push(`/agent/orders/${order.id}`)}
            hideTotal
          />
        ))}
      </div>
    </div>
  );
}
