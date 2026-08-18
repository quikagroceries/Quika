"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import HistoryOrderCard from "@/components/HistoryOrderCard";
import OrderDetail from "@/screens/OrderDetail";
import { useActiveOrders } from "@/lib/useActiveOrders";

/**
 * The standing "how's my order going" destination — always in the nav, not
 * just a banner that happens to be on screen. Deliberately thin: it decides
 * WHICH order(s) to show, then hands off to OrderDetail (one order) or a
 * filtered list of HistoryOrderCards (several) rather than re-building
 * tracking UI that already exists.
 */
function TrackOrder() {
  const router = useRouter();
  const orders = useActiveOrders();

  if (orders === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-ink/40">
        <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p>Loading…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div>
        <h1 className="mb-1 font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          Track
        </h1>
        <p className="mb-6 text-[#6b635a]">Live status for whatever your agent&apos;s doing right now.</p>
        <EmptyState
          icon="pin"
          title="No active orders"
          subtitle="Once you place an order, it shows up here in real time — from agent assignment through delivery."
        />
        <Button onClick={() => router.push("/shop")} className="mt-4">
          Start shopping
        </Button>
      </div>
    );
  }

  // Exactly one - skip straight to its tracking screen, no list to pick from.
  if (orders.length === 1) {
    return (
      <OrderDetail
        orderId={orders[0].id}
        onBack={() => router.push("/shop")}
        onTopUpWallet={() => router.push("/wallet")}
      />
    );
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
        Track
      </h1>
      <p className="mb-6 text-[#6b635a]">
        You have {orders.length} orders in progress — pick one to see its status.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <HistoryOrderCard
            key={order.id}
            order={order}
            marketName={order.marketName}
            counterpartLabel="Agent"
            counterpartId={order.agent_id}
            onClick={() => router.push(`/orders/${order.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

export default TrackOrder;
