"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Card from "@/components/Card";
import HeroBanner from "@/components/HeroBanner";
import SectionHeader from "@/components/SectionHeader";
import StatTile from "@/components/StatTile";
import agentScene from "@/assets/illustrations/scene-agent-laptop-delivery.png";
import cartVendor from "@/assets/illustrations/market-cart-vendor.png";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { useAuth } from "@/components/AuthProvider";

function isReadyToShop(o) {
  return o.status === "agent_assigned";
}
function isInProgress(o) {
  return o.status === "shopping";
}
function isNeedsAttention(o) {
  return o.status === "cancelled_unpaid";
}

const TONE_STYLES = {
  ready: "border-brand-orange/60",
  progress: "border-line",
  attention: "border-red-300",
};

function TaskCard({ order, marketName, onClick, tone }: any) {
  return (
    <Card interactive onClick={onClick} className={"border-2 " + TONE_STYLES[tone]}>
      <div className="flex items-center justify-between">
        <StatusBadge status={order.status} />
        <span className="text-xs text-faint">Order {order.id.slice(0, 8)}…</span>
      </div>
      <div className="mt-3 text-muted">
        {order.items ? order.items.length : 0} item{order.items && order.items.length === 1 ? "" : "s"}
      </div>
      <div className="mt-1 text-base font-semibold text-ink/80">{marketName || "—"}</div>
      {tone === "attention" && (
        <div className="mt-2 text-sm font-semibold text-red-600">
          Balance wasn&apos;t paid — please return these goods to the market/vendor.
        </div>
      )}
    </Card>
  );
}

function TaskSection({ title, subtitle, orders, tone, marketName, onOpen }: any) {
  if (orders.length === 0) return null;
  return (
    <div className="mb-8">
      <SectionHeader
        icon={tone === "attention" ? "alert" : tone === "ready" ? "basket" : "clock"}
        title={title}
        subtitle={subtitle}
        className="mb-3"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <TaskCard key={o.id} order={o} tone={tone} marketName={marketName(o.market_id)} onClick={() => onOpen(o.id)} />
        ))}
      </div>
    </div>
  );
}

export default function AgentHomePage() {
  const router = useRouter();
  const { handleLogout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

  const marketName = (id) => markets.find((m) => m.id === id)?.name;
  const actionable = orders.filter((o) => o.status === "agent_assigned" || o.status === "shopping");
  const readyToShop = actionable.filter(isReadyToShop);
  const inProgress = actionable.filter(isInProgress);
  const needsAttention = orders.filter(isNeedsAttention);
  const noTasks = !loading && actionable.length === 0 && needsAttention.length === 0;

  return (
    <div>
      <HeroBanner
        eyebrow={actionable.length > 0 ? `${actionable.length} task${actionable.length === 1 ? "" : "s"} waiting` : "Agent home"}
        live={actionable.length > 0}
        title={
          loading
            ? "Loading your tasks…"
            : needsAttention.length > 0
              ? "Something needs your attention."
              : readyToShop.length > 0
                ? "A list is waiting for you."
                : inProgress.length > 0
                  ? "You're mid-run. Keep going."
                  : "All clear for now."
        }
        body="Your tasks, most urgent first. Open one to see the list, chat with the customer and start shopping."
        illustration={readyToShop.length + inProgress.length > 0 ? agentScene : cartVendor}
        illustrationAlt="An agent shopping the market"
      >
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Ready to shop" value={readyToShop.length} />
          <StatTile label="In progress" value={inProgress.length} />
          <StatTile label="Needs attention" value={needsAttention.length} />
        </div>
      </HeroBanner>

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
        onOpen={(id) => router.push(`/agent/orders/${id}`)}
      />
      <TaskSection
        title="Ready to shop"
        subtitle="Start shopping now."
        orders={readyToShop}
        tone="ready"
        marketName={marketName}
        onOpen={(id) => router.push(`/agent/orders/${id}`)}
      />
      <TaskSection
        title="In progress"
        subtitle="You're actively shopping these."
        orders={inProgress}
        tone="progress"
        marketName={marketName}
        onOpen={(id) => router.push(`/agent/orders/${id}`)}
      />
    </div>
  );
}
