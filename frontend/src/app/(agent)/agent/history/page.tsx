"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import EmptyState from "@/components/EmptyState";
import HeroBanner from "@/components/HeroBanner";
import StatTile from "@/components/StatTile";
import history from "@/assets/illustrations/history.png";
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
      <HeroBanner
        eyebrow="History"
        title="Every run you've shopped."
        body="Active and finished orders in one place. Open any to revisit the list, the chat and the receipts."
        illustration={history}
        illustrationAlt="Order history"
      >
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Total orders" value={orders.length} />
          <StatTile label="Active" value={filterOrders(orders, "active").length} />
          <StatTile label="Finished" value={orders.length - filterOrders(orders, "active").length} />
        </div>
      </HeroBanner>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <FilterPills variant="segmented" options={ORDER_FILTERS} value={statusFilter} onChange={setStatusFilter} />

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
