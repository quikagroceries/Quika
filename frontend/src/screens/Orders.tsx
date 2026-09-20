'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import FilterPills from "@/components/FilterPills";
import HeroBanner from "@/components/HeroBanner";
import HistoryOrderCard from "@/components/HistoryOrderCard";
import Icon from "@/components/Icon";
import StatTile from "@/components/StatTile";
import { CardSkeleton } from "@/components/Skeleton";
import { usePageSearch } from "@/components/PageSearchContext";
import { useAllOrders } from "@/lib/useActiveOrders";
import { isCancellableOrder, isDeletableOrder, isHistoryStatus, summarizeOrderStatus } from "@/lib/orderStatus";
import { draftFromOrder } from "@/lib/orderToDraft";
import { loadGuestDraft, saveGuestDraft } from "@/lib/guestDraft";
import { SHOP_CHIPS } from "@/lib/heroChips";
import riderScooter from "@/assets/illustrations/rider-scooter-basket-2.png";
import netBag from "@/assets/illustrations/net-bag.png";

// One place for everything about your orders: what's on the move (Active),
// what's finished (History - the old History page), and lists you
// started but haven't sent (Lists). A "draft" order IS an unsent list, so the
// split is a display filter, not a data-model one - nothing here is deleted or
// hidden server-side. The URL carries the tab (?tab=past) so it's linkable and
// survives a refresh.
const PAST_FILTERS = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function Orders() {
  const router = useRouter();
  const params = useSearchParams();
  // Shared, cached, and polled once for the whole app (see sharedQuery): coming
  // back to this page shows the last data immediately and refreshes behind it.
  const { orders: cachedOrders, markets, refresh } = useAllOrders();
  const orders: any[] | null = cachedOrders ?? null;
  const [error] = useState("");
  // ?tab=past was the first name for History; keep those links working.
  const rawTab = params.get("tab");
  const explicitTab = rawTab === "past" ? "history" : rawTab;
  const [tab, setTab] = useState<string>(explicitTab || "active");
  const [pastFilter, setPastFilter] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState("");
  const search = usePageSearch("Search your orders…");

  const loadOrders = refresh;

  const marketFor = (id: string) => markets.find((m) => m.id === id);
  const all = orders || [];
  const active = all.filter((o) => o.status !== "draft" && !isHistoryStatus(o.status));
  const past = all.filter((o) => isHistoryStatus(o.status));
  const drafts = all.filter((o) => o.status === "draft");

  // First load with no explicit tab: land where there's something to see -
  // coming back after a delivery, "Active" would just be empty.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (orders === null || settled) return;
    setSettled(true);
    if (!explicitTab && active.length === 0) {
      if (past.length > 0) setTab("history");
      else if (drafts.length > 0) setTab("lists");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- decide once, on first load
  }, [orders]);

  function pickTab(key: string) {
    setTab(key);
    router.replace(`/track?tab=${key}`, { scroll: false });
  }

  const matches = (o: any) =>
    !search ||
    [
      marketFor(o.market_id)?.name,
      String(o.status || "").replaceAll("_", " "),
      o.id,
      ...(o.items || []).map((it: any) => it.description),
    ].some((v) => String(v || "").toLowerCase().includes(search));

  const pastShown = past.filter((o) =>
    pastFilter === "all" ? true : pastFilter === "completed" ? o.status === "delivered" || o.status === "closed" : o.status === "cancelled" || o.status === "cancelled_unpaid"
  );
  const visible = (tab === "history" ? pastShown : tab === "lists" ? drafts : active).filter(matches);

  async function handleDelete(id: string) {
    setActionError(""); setDeleting(true);
    try {
      await api.deleteOrder(id);
      setConfirmDeleteId(null);
      await loadOrders();
    } catch (e: any) {
      setActionError("Could not delete: " + e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleCancel(id: string) {
    setActionError(""); setCancelling(true);
    try {
      await api.cancelOrder(id);
      setConfirmCancelId(null);
      await loadOrders();
    } catch (e: any) {
      setActionError("Could not cancel: " + e.message);
    } finally {
      setCancelling(false);
    }
  }

  // Reuse = seed the same localStorage draft the shop flow already restores on
  // mount (see NewOrderFlow's hydrate), then open the shop: the list arrives
  // pre-filled, delivery is re-picked, and it's sent as a brand-new order.
  function reuseList(order: any) {
    const existing: any = loadGuestDraft()?.stagedList;
    if (existing?.itemCount > 0 && !window.confirm("Replace the list you're currently building with this one?")) return;
    saveGuestDraft({
      marketId: order.market_id,
      step: "list",
      stagedList: draftFromOrder(order),
      address: order.delivery_address || "",
      marketSlug: null,
    });
    router.push("/shop");
  }

  const actionBtn =
    "flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs font-bold text-ink transition hover:border-brand-orange/40 hover:bg-brand-orange/10";
  const reuseButton = (order: any) => (
    <button onClick={() => reuseList(order)} className={actionBtn}>
      <Icon name="basket" className="h-3.5 w-3.5" />
      Use again
    </button>
  );

  function deleteControl(order: any, noun: string) {
    return confirmDeleteId === order.id ? (
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm text-muted">Delete this {noun}?</span>
        <Button variant="neutral" onClick={() => setConfirmDeleteId(null)} disabled={deleting} className="px-3 text-sm">
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
        className="flex items-center gap-1.5 text-sm font-semibold text-faint hover:text-red-600"
      >
        <Icon name="trash" className="h-4 w-4" />
        Delete
      </button>
    );
  }

  function footerFor(order: any) {
    if (tab === "lists") {
      // A confirmation, when open, takes the whole row - two prompts in one
      // narrow footer would be unreadable.
      if (confirmDeleteId === order.id) return deleteControl(order, "list");
      return (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => router.push(`/history/${order.id}/edit`)} className={actionBtn}>
            <Icon name="settings" className="h-3.5 w-3.5" />
            Edit
          </button>
          {reuseButton(order)}
          <span className="ml-auto">{deleteControl(order, "list")}</span>
        </div>
      );
    }
    if (tab === "history") return <div className="flex flex-wrap items-center gap-2">{reuseButton(order)}</div>;
    // Active
    if (isDeletableOrder(order)) return deleteControl(order, "order");
    if (isCancellableOrder(order)) {
      return confirmCancelId === order.id ? (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm text-muted">Cancel? Your deposit will be refunded.</span>
          <Button variant="neutral" onClick={() => setConfirmCancelId(null)} disabled={cancelling} className="px-3 text-sm">
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
          className="flex items-center gap-1.5 text-sm font-semibold text-faint hover:text-red-600"
        >
          <Icon name="trash" className="h-4 w-4" />
          Cancel order (deposit refunded)
        </button>
      );
    }
    return undefined;
  }

  const shopping = active.filter((o) => o.status === "shopping").length;
  const outForDelivery = active.filter((o) => o.status === "out_for_delivery").length;
  const tabs = [
    { key: "active", label: `Active${active.length ? ` · ${active.length}` : ""}` },
    { key: "history", label: `History${past.length ? ` · ${past.length}` : ""}` },
    { key: "lists", label: `Lists${drafts.length ? ` · ${drafts.length}` : ""}` },
  ];

  return (
    <div className="flex flex-1 flex-col">
      {active.length === 0 ? (
        <HeroBanner
          eyebrow="Orders"
          title="Nothing on the move right now."
          body="Once an agent starts shopping your list, this is where you watch it happen — live prices, photo proof from the stall, and the handover code for your door. Your order history and saved lists live here too."
          illustration={netBag}
          actions={<Button onClick={() => router.push("/shop")}>Start shopping</Button>}
          chips={SHOP_CHIPS}
        />
      ) : (
        <HeroBanner
          eyebrow={`${active.length} order${active.length === 1 ? "" : "s"} in progress`}
          live
          title="Your agents are on it."
          body={
            active.length === 1
              ? summarizeOrderStatus({ ...active[0], marketName: marketFor(active[0].market_id)?.name })
              : "Every list you've sent out, in one place. Open any order for live prices, photo proof, and its delivery status."
          }
          illustration={riderScooter}
          illustrationAlt="Rider delivering an order"
          actions={
            active.length === 1 ? (
              <Button onClick={() => router.push(`/orders/${active[0].id}`)}>Open live tracking</Button>
            ) : undefined
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="In progress" value={active.length} />
            <StatTile label="Being shopped" value={shopping} />
            <StatTile label="Out for delivery" value={outForDelivery} />
            <StatTile label="Markets" value={new Set(active.map((o) => o.market_id)).size} />
          </div>
        </HeroBanner>
      )}

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {actionError && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>}

      <FilterPills variant="segmented" options={tabs} value={tab} onChange={pickTab} />
      {tab === "history" && past.length > 0 && <FilterPills options={PAST_FILTERS} value={pastFilter} onChange={setPastFilter} />}

      {orders === null && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {orders !== null && visible.length === 0 && (
        search ? (
          <EmptyState icon="clock" title="No matches" subtitle={`Nothing here matches “${search}”.`} />
        ) : tab === "history" ? (
          <EmptyState
            icon="clock"
            title={past.length ? "Nothing in this filter" : "No order history yet"}
            subtitle={past.length ? "Try a different filter." : "Delivered and cancelled orders will show up here."}
          />
        ) : tab === "lists" ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <EmptyState
              icon="clock"
              title="No lists in progress"
              subtitle="A list you start but don't send yet shows up here, so you can pick it back up later."
            />
            <Button onClick={() => router.push("/shop")}>Start writing a list</Button>
          </div>
        ) : null
      )}

      <div className="mt-4 grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orders !== null &&
          visible.map((order) => (
            <HistoryOrderCard
              key={order.id}
              order={order}
              market={marketFor(order.market_id)}
              statusLine={tab === "active" ? summarizeOrderStatus({ ...order, marketName: marketFor(order.market_id)?.name }) : undefined}
              hideTotal={tab === "lists"}
              onClick={() => router.push(`/orders/${order.id}`)}
              footer={footerFor(order)}
            />
          ))}
      </div>
    </div>
  );
}

export default Orders;
