'use client';

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import ChatPanel from "@/screens/ChatPanel";
import Notifications from "@/screens/Notifications";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import PackagingPanel from "@/components/PackagingPanel";
import StatusBadge from "@/components/StatusBadge";
import Icon from "@/components/Icon";
import { isChatAvailable } from "@/lib/orderStatus";
import { marketTone, TONE_COVER } from "@/lib/vendorVisuals";
import { coverImageForMarket } from "@/lib/marketDirectory";

const POLL_MS = 5000;

function Shopping({ orderId, onBack }: any) {
  const [order, setOrder] = useState<any>(null);
  // Best-effort market name for the header - mirrors OrderDetail's own
  // lookup (the order itself only carries market_id).
  const [market, setMarket] = useState<any>(null);
  const [selected, setSelected] = useState<any[]>([]);   // item ids ticked for this stall
  const [account, setAccount] = useState("");      // vendor account number
  const [bankCode, setBankCode] = useState("");    // vendor bank code
  // Price typed per selected item id (#8) - never one combined total split
  // evenly across items. Keyed by item id so toggling a checkbox off/on
  // doesn't lose whatever was already typed for the others.
  const [itemPrices, setItemPrices] = useState<any>({});
  // One proof-of-purchase photo per stall transfer. Never blocks the
  // transfer/the money itself at pay time (see handlePay below) - but it IS
  // required before finish-shopping (see `purchases`/missingPhotos below),
  // so a skipped one just needs attaching later, not before paying.
  const [photoUrl, setPhotoUrl] = useState<any>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  // Successful vendor transfers for this order, loaded once shopping starts -
  // drives the missing-photo list below and the finish-shopping gate.
  const [purchases, setPurchases] = useState<any[]>([]);
  // Which purchase (by transfer id) currently has a photo picker open and
  // mid-upload - lets each row show its own busy state independently.
  const [attachingPhotoFor, setAttachingPhotoFor] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);         // disables buttons mid-request
  const loadedRef = useRef(false); // has the FIRST load ever succeeded?
  const photoInputRef = useRef(null);
  const attachPhotoInputRef = useRef(null);
  // This market's stalls, for showing an item's preferred_stall_id as a
  // name (not a bare id) - reuses GET /markets/{id}/vendors, the same read
  // path the customer-side "prefer a stall" picker uses. Also lets a newly
  // registered stall (see handleAddStall) resolve immediately.
  const [vendors, setVendors] = useState<any[]>([]);
  const [addingStall, setAddingStall] = useState(false);
  const [stallName, setStallName] = useState("");
  const [stallDesc, setStallDesc] = useState("");
  const [stallBusy, setStallBusy] = useState(false);

  // Reload the order from the server. Used both for the initial load and for
  // periodic polling below, so changes the customer makes (e.g. approving a
  // spending increase) show up here without a manual reload - never throws:
  // a background poll failing shouldn't blank out an already-working screen,
  // so a load failure only surfaces if nothing has ever loaded successfully.
  //
  // Deliberately never fetches the order's spending authorization - the
  // agent must not see the total cap or any customer-total figure, only
  // per-item context (each item's own listed_price, shown in the list below).
  async function refresh() {
    try {
      const fresh = await api.getOrder(orderId);
      setOrder(fresh);
      loadedRef.current = true;
      setError("");
      if (fresh.status === "shopping") await loadPurchases();
    } catch {
      if (!loadedRef.current) setError("Could not load the order.");
    }
  }

  // Backs the missing-photo list and the finish-shopping gate below.
  async function loadPurchases() {
    try {
      setPurchases(await api.getPurchases(orderId));
    } catch {
      // best-effort - a failed poll shouldn't blank out an already-shown list
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one interval per orderId, matches Chat.jsx's poll pattern
  }, [orderId]);

  useEffect(() => {
    if (!order?.market_id) return;
    api.getMarketVendors(order.market_id).then(setVendors).catch(() => {});
  }, [order?.market_id]);

  useEffect(() => {
    if (!order?.market_id) return;
    api
      .getMarkets()
      .then((list: any[]) => setMarket(list.find((m) => m.id === order.market_id) || null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when the order's market changes
  }, [order?.market_id]);

  function preferredStallName(id) {
    return vendors.find((v) => v.id === id)?.name || null;
  }

  // A single point, captured silently at save time - never a tracked path,
  // never a required step. Resolves to null (not an error) on denial,
  // timeout, or an unsupported browser, so a missing/blocked location can
  // never hold up registering the stall.
  function getLocationSilently(timeoutMs = 4000) {
    return new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      const timer = setTimeout(() => resolve(null), timeoutMs);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => { clearTimeout(timer); resolve(null); },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
      );
    });
  }

  // Register a stall on the fly - live immediately, no approval gate. Not
  // tied to any one item; it just makes the stall findable for everyone
  // (this order's preferred_stall_id tags, future customers browsing this
  // market) from here on.
  async function handleAddStall() {
    if (!stallName.trim()) return;
    setError(""); setStallBusy(true);
    try {
      const loc = await getLocationSilently();
      const v = await api.createVendor(order.market_id, {
        name: stallName.trim(),
        stall_description: stallDesc.trim() || undefined,
        ...(loc || {}),
      });
      setVendors((cur) => [...cur, v]);
      setStallName(""); setStallDesc(""); setAddingStall(false);
    } catch (e) {
      setError("Could not add stall: " + e.message);
    } finally {
      setStallBusy(false);
    }
  }

  async function handleStart() {
    setError(""); setBusy(true);
    try {
      await api.startShopping(orderId);
      await refresh();
    } catch (e) {
      setError("Could not start: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // Send the order back to the assignment pool - the agent-side analog of a
  // customer deleting a draft. Only legal before shopping starts (the
  // backend enforces this too). Always leaves the screen afterward: if
  // another agent covers the market it's no longer this agent's order to
  // view, and even if it lands right back on them (the only agent for the
  // market), the order list will show it again to reopen.
  async function handleRelease() {
    setError(""); setBusy(true);
    try {
      await api.releaseOrder(orderId);
      onBack();
    } catch (e) {
      setError("Could not release: " + e.message);
      setBusy(false);
    }
  }

  // Tick / untick an item for the current stall payment. Ticking on an item
  // that just had its overage approved pre-fills the price the agent asked
  // for, so they're not stuck retyping it.
  function toggle(itemId) {
    setSelected((cur) =>
      cur.includes(itemId) ? cur.filter((x) => x !== itemId) : [...cur, itemId]
    );
    const item = (order?.items || []).find((it) => it.id === itemId);
    if (item?.overage_decision === "approved" && item.overage_requested_price != null) {
      setItemPrices((cur) =>
        cur[itemId] ? cur : { ...cur, [itemId]: String(item.overage_requested_price) }
      );
    }
  }

  // Best-effort: a failed upload just leaves photoUrl null - the Pay button
  // is never gated on it, per #6 (a photo must never block the transfer).
  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoUploading(true);
    setError("");
    try {
      setPhotoUrl(await api.uploadPurchasePhoto(file));
    } catch (e2) {
      setError("Photo upload failed (you can still pay without it): " + e2.message);
    } finally {
      setPhotoUploading(false);
    }
  }

  // Attach a photo to an ALREADY-completed transfer, after the fact -
  // required before finish-shopping (see the missing-photo list below), but
  // the transfer itself was never blocked on it.
  function openAttachPhotoPicker(transferId) {
    setAttachingPhotoFor(transferId);
    attachPhotoInputRef.current?.click();
  }

  async function handleAttachPhotoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const transferId = attachingPhotoFor;
    if (!file || !transferId) { setAttachingPhotoFor(null); return; }
    setError("");
    try {
      const url = await api.uploadPurchasePhoto(file);
      await api.attachPurchasePhoto(orderId, transferId, url);
      await loadPurchases();
    } catch (e2) {
      setError("Could not attach photo: " + e2.message);
    } finally {
      setAttachingPhotoFor(null);
    }
  }

  async function handlePay() {
    setError(""); setBusy(true);
    try {
      await api.payVendor(orderId, {
        account_number: account,
        bank_code: bankCode,
        // Each selected item keeps its own typed price - the transfer
        // amount is derived server-side as their sum, never a separate
        // free-typed total (no even-split fabrication).
        items: selected.map((id) => ({ item_id: id, price: itemPrices[id] })),
        // One proof-of-purchase photo per transfer, if one was uploaded
        // right away - never required at pay time (see handleAttachPhotoChange
        // above for attaching one later if this is skipped).
        photo_ref: photoUrl || undefined,
      });
      // Reset the stall form and reload to show items now bought.
      setSelected([]); setAccount(""); setBankCode(""); setItemPrices({}); setPhotoUrl(null);
      await refresh();
    } catch (e) {
      setError("Payment failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // #5: the typed price for this item is above what the customer listed -
  // request their approval instead of paying it. Drops the item out of the
  // current stall selection so "Pay vendor" only ever covers items that are
  // actually clear to buy.
  async function handleRequestOverage(itemId) {
    setError(""); setBusy(true);
    try {
      await api.requestItemOverage(orderId, itemId, itemPrices[itemId]);
      setSelected((cur) => cur.filter((id) => id !== itemId));
      setItemPrices((cur) => {
        const next = { ...cur };
        delete next[itemId];
        return next;
      });
      await refresh();
    } catch (e) {
      setError("Could not request approval: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnavailable(itemId) {
    setError(""); setBusy(true);
    try {
      await api.flagUnavailable(orderId, itemId);
      await refresh();
    } catch (e) {
      setError("Could not flag item: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    setError(""); setBusy(true);
    try {
      await api.finishShopping(orderId);
      await refresh();
    } catch (e) {
      setError("Could not finish: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted">
        <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p>Loading order…</p>
      </div>
    );
  }

  const items = order.items || [];
  const isShopping = order.status === "shopping";

  // Hoisted out of the pay panel's JSX (rather than an inline IIFE) so the
  // photo-picker's ref access below stays a plain, un-nested closure - an
  // inline IIFE invoked during render confuses the ref-safety lint rule
  // even though the actual ref read only ever happens inside its own
  // onClick, never synchronously during render.
  const selectedItems = items.filter((it) => selected.includes(it.id));
  const allPriced = selectedItems.every((it) => Number(itemPrices[it.id]) > 0);
  const payTotal = selectedItems.reduce((sum, it) => sum + (Number(itemPrices[it.id]) || 0), 0);
  // #5: a typed price above the customer's listed price isn't payable yet -
  // it needs their approval first. An item already approved
  // (overage_decision === "approved") is exempt even if its price is still
  // above listed_price, since that's the customer-approved figure, not a
  // fresh unapproved overage.
  const isOverage = (it) =>
    it.listed_price != null &&
    Number(itemPrices[it.id]) > Number(it.listed_price) &&
    it.overage_decision !== "approved";
  const anyOverage = selectedItems.some(isOverage);
  // Purchase-photo required (per transfer): the transfer itself was never
  // blocked on this, but finish-shopping refuses while any successful
  // purchase is still missing one - this drives that list and the gate.
  const missingPhotoPurchases = purchases.filter((p) => !p.photo_ref);

  // Written from the agent's own point of view, not reused customer copy -
  // "Agent is shopping — 1 of 2 bought" reads oddly in the third person on
  // the agent's own screen; a direct progress readout is both more natural
  // and more useful to glance at mid-shop.
  const boughtCount = items.filter((it) => it.confirmed_price != null).length;
  const heroHeadline =
    order.status === "agent_assigned" ? "Ready to shop"
    : order.status === "shopping" ? `${boughtCount} of ${items.length} bought`
    : order.status === "paid" ? "Pack & dispatch"
    : order.status === "packed" ? "Packed — awaiting pickup"
    : order.status === "out_for_delivery" ? "Out for delivery"
    : order.status === "delivered" || order.status === "closed" ? "Delivered"
    : order.status === "cancelled_unpaid" ? "Balance not paid"
    : "Order status";

  // Light tint now, not a dark-ink fallback - cream/white surfaces only,
  // per the app's no-dark-surfaces rule. Text over this hero is dark ink,
  // not white, to match.
  const heroBg = market ? TONE_COVER[marketTone(market.name, market.city)].bg : "#F0ECE0";
  const heroBody =
    order.status === "agent_assigned"
      ? "Start shopping when you're ready — bargain live, buy, and keep proof of purchase."
      : order.status === "shopping"
        ? "Tick items as you buy them and pay each stall directly below."
        : order.status === "paid"
          ? "Pack this order and hand it to the courier."
          : order.status === "cancelled_unpaid"
            ? "The balance window lapsed — return any goods you already bought."
            : "Live status for this order.";

  return (
    <div>
      <Notifications />

      {/* Same hero treatment as the customer/admin order screens - market
          identity + a live status line, not a bare "Order xxx…" row, so
          this reads as the same product regardless of which side of the
          order you're on. Back floats over the banner itself. */}
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
            aria-label="Back"
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
            {heroHeadline}
          </h2>
          <p className="text-sm leading-relaxed text-ink/70 sm:text-base line-clamp-2">{heroBody}</p>
        </div>
      </div>

      {/* #1: chat is scoped to the shopping window - see isChatAvailable.
          Labeled, same as the customer side, so it's obvious a chat with
          the customer exists rather than relying on a small icon. */}
      {isChatAvailable(order.status) && (
        <div className="mb-4">
          <ChatPanel orderId={orderId} variant="button" label="Chat with customer" />
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div>
        {/* Phase 5: the balance window lapsed — deposit forfeited, no
            packaging/courier for an unpaid order. Only thing left to do. */}
        {order.status === "cancelled_unpaid" && (
          <div className="mb-4 rounded-xl border-2 border-red-400 bg-red-50 p-4">
            <p className="font-bold text-red-700">Balance not paid in time</p>
            <p className="mt-1 text-sm text-red-600">
              The customer didn't pay the remaining balance within the window, so this order is cancelled and the deposit is forfeited. Please return any goods you already bought.
            </p>
          </div>
        )}

        {/* Before shopping starts */}
          {order.status === "agent_assigned" && (
            <div className="mb-4 space-y-2">
              <Button onClick={handleStart} busy={busy} fullWidth className="text-lg">
                Start shopping
              </Button>
              <Button variant="neutral" onClick={handleRelease} busy={busy} fullWidth>
                Release this order
              </Button>
            </div>
          )}

          {/* Phase 2+3: once the balance is paid, packaging is the next
              action — packing never starts before this (backend enforces
              PAID as the precondition for /pack). */}
          {order.status === "paid" && (
            <div className="mb-4">
              <PackagingPanel order={order} onPacked={refresh} />
            </div>
          )}

          {["packed", "out_for_delivery", "delivered", "closed"].includes(order.status) &&
            order.courier_reference && (
              <div className="mb-4 rounded-xl bg-brand-green/10 px-4 py-3 text-sm font-semibold text-brand-green">
                Handed to courier — reference {order.courier_reference}
              </div>
            )}

          {/* Stall not in the system yet — register it on the fly. Live
              immediately, no approval gate; just makes it findable going
              forward (this order's tags, future customers' stall browse). */}
          {isShopping && (
            <div className="mb-3">
              {!addingStall ? (
                <button
                  type="button"
                  onClick={() => setAddingStall(true)}
                  className="text-sm font-semibold text-brand-orange hover:underline"
                >
                  + Register a stall not listed here
                </button>
              ) : (
                <Card className="py-3">
                  <p className="mb-2 text-sm font-bold text-ink">New stall at this market</p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Stall name"
                      value={stallName}
                      onChange={(e) => setStallName(e.target.value)}
                    />
                    <Input
                      placeholder="Rough location / what they sell (optional)"
                      value={stallDesc}
                      onChange={(e) => setStallDesc(e.target.value)}
                    />
                  </div>
                  <p className="mt-2 text-xs text-faint">
                    We&apos;ll tag this stall&apos;s location from your phone automatically — no extra step.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={handleAddStall}
                      busy={stallBusy}
                      disabled={!stallName.trim()}
                      className="flex-1"
                    >
                      Save stall
                    </Button>
                    <Button
                      variant="neutral"
                      onClick={() => {
                        setAddingStall(false);
                        setStallName("");
                        setStallDesc("");
                      }}
                      disabled={stallBusy}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* The item list — scan-fast, minimal clutter */}
          <div className="space-y-2">
            {items.map((item) => {
              const bought = item.confirmed_price != null;
              // "dropped": the customer said skip it entirely - greyed out,
              // no longer actionable. "unavailable": flagged, waiting on the
              // customer's decision - also not actionable yet (re-flagging or
              // ticking it off before they answer would be wrong). Anything
              // else (including "buy_elsewhere", where the customer said keep
              // looking) stays fully actionable, same as before.
              const dropped = !bought && item.availability === "dropped";
              const waitingOnCustomer = !bought && item.availability === "unavailable";
              const overagePending = !bought && item.availability === "overage_pending";
              const actionable = isShopping && !bought && !dropped && !waitingOnCustomer && !overagePending;
              return (
                <Card key={item.id} className={(bought || dropped) ? "bg-sunken-2 py-3" : "py-3"}>
                  <div className="flex items-center gap-2">
                    {actionable && (
                      <label className="-m-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selected.includes(item.id)}
                          onChange={() => toggle(item.id)}
                          className="h-6 w-6 accent-brand-orange"
                        />
                      </label>
                    )}
                    {bought && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                        <Icon name="check" className="h-4 w-4" />
                      </span>
                    )}
                    {dropped && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8e4df] text-faint">
                        <Icon name="trash" className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className={"font-semibold " + (bought || dropped ? "text-faint line-through" : "text-ink")}>
                        {item.description}
                      </div>
                      {item.requested_note && actionable && (
                        <div className="text-sm text-muted">{item.requested_note}</div>
                      )}
                      {item.listed_price != null && actionable && (
                        <div className="text-sm text-muted">
                          Customer expected: ₦{item.listed_price}
                        </div>
                      )}
                      {item.preferred_stall_id && actionable && (
                        <div className="text-sm font-semibold text-brand-orange">
                          Preferred stall: {preferredStallName(item.preferred_stall_id) || "…"}
                        </div>
                      )}
                      {bought && (
                        <div className="font-semibold text-brand-green">
                          Bought — ₦{item.confirmed_price}
                        </div>
                      )}
                      {dropped && (
                        <div className="text-sm font-semibold text-faint">Dropped by customer</div>
                      )}
                      {waitingOnCustomer && (
                        <div className="text-sm font-semibold text-amber-700">Waiting for customer's decision</div>
                      )}
                      {overagePending && (
                        <div className="text-sm font-semibold text-amber-700">
                          Waiting for customer to approve ₦{item.overage_requested_price}
                        </div>
                      )}
                    </div>
                    {actionable && (
                      <Button
                        variant="neutral"
                        onClick={() => handleUnavailable(item.id)}
                        disabled={busy}
                        className="shrink-0 px-3 text-sm text-red-600"
                      >
                        {item.preferred_stall_id
                          ? `Not at ${preferredStallName(item.preferred_stall_id) || "this stall"}`
                          : "Not here"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pay-a-stall panel: only while shopping and with items ticked — the
              core, most-repeated action, so it gets the strongest treatment.
              One transfer can still cover several items bought together at
              this stall, but each keeps its OWN typed price (#8) - no
              combined total to split evenly and fabricate per-item prices. */}
          {isShopping && selected.length > 0 && (
              <div className="mt-4 rounded-2xl bg-brand-orange/[0.12] p-4">
                <p className="mb-3 text-lg font-bold text-ink">
                  Pay for {selected.length} item{selected.length === 1 ? "" : "s"} from this stall
                </p>
                <div className="space-y-2">
                  <Input
                    placeholder="Vendor account number"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                  />
                  <Input
                    placeholder="Bank code (e.g. 999992 for OPay)"
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                  />
                </div>

                <div className="mt-3 space-y-2 border-t border-line pt-3">
                  {selectedItems.map((it) => (
                    <div key={it.id}>
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-ink/80">{it.description}</span>
                        <Input
                          placeholder="₦ price"
                          value={itemPrices[it.id] || ""}
                          onChange={(e) => setItemPrices((cur) => ({ ...cur, [it.id]: e.target.value }))}
                          className="w-28 shrink-0"
                        />
                      </div>
                      {isOverage(it) && (
                        <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-2 py-1.5">
                          <span className="text-xs text-amber-700">
                            Above the ₦{it.listed_price} the customer listed — needs their approval.
                          </span>
                          <Button
                            variant="neutral"
                            onClick={() => handleRequestOverage(it.id)}
                            disabled={busy || !(Number(itemPrices[it.id]) > 0)}
                            className="shrink-0 px-2 py-1 text-xs"
                          >
                            Request approval
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {payTotal > 0 && (
                  <div className="mt-3 flex justify-between border-t border-line pt-2 text-sm">
                    <span className="text-muted">Total to this stall</span>
                    <span className="font-bold text-ink">₦{payTotal.toFixed(2)}</span>
                  </div>
                )}

                {/* #6: optional proof-of-purchase photo, one per transfer -
                    best-effort only, never required to pay. */}
                <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                  {photoUrl ? (
                    <img src={photoUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      className="flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line-strong text-faint disabled:opacity-50"
                    >
                      <Icon name="camera" className="h-5 w-5" />
                      <span className="text-[10px] font-semibold">{photoUploading ? "…" : "Add"}</span>
                    </button>
                  )}
                  <span className="text-sm text-muted">Purchase photo (optional)</span>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>

                <Button
                  onClick={handlePay}
                  busy={busy}
                  disabled={!account || !bankCode || !allPriced || anyOverage}
                  fullWidth
                  className="mt-3 text-lg"
                >
                  Pay vendor
                </Button>
                {anyOverage && (
                  <p className="mt-2 text-xs text-amber-700">
                    Request approval for the item above (or untick it) before paying the rest.
                  </p>
                )}
              </div>
          )}

          {/* Purchase photo required (per transfer): the transfer already
              fired - this is just the accountability catch-up before
              finishing can happen. Never shown for a stall that already has
              one. */}
          {isShopping && missingPhotoPurchases.length > 0 && (
            <div className="mt-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
              <p className="mb-1 font-bold text-amber-800">
                {missingPhotoPurchases.length} purchase{missingPhotoPurchases.length === 1 ? "" : "s"} need{missingPhotoPurchases.length === 1 ? "s" : ""} a photo
              </p>
              <p className="mb-3 text-sm text-amber-700">
                Money already moved for these - just attach proof before finishing.
              </p>
              <div className="space-y-2">
                {missingPhotoPurchases.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                    <span className="text-sm font-semibold text-ink/80">₦{p.amount} — {p.account_number}</span>
                    <Button
                      variant="neutral"
                      onClick={() => openAttachPhotoPicker(p.id)}
                      disabled={attachingPhotoFor === p.id}
                      busy={attachingPhotoFor === p.id}
                      className="shrink-0 px-3 py-1.5 text-sm"
                    >
                      Add photo
                    </Button>
                  </div>
                ))}
              </div>
              <input
                ref={attachPhotoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleAttachPhotoChange}
                className="hidden"
              />
            </div>
          )}

          {/* Finish — the other dominant action, visually distinct (green) from
              Pay vendor so the two can't be confused mid-shop. */}
          {isShopping && (
            <>
              <Button
                variant="secondary"
                onClick={handleFinish}
                busy={busy}
                disabled={missingPhotoPurchases.length > 0}
                fullWidth
                className="mt-6 text-lg"
              >
                Finish shopping
              </Button>
              {missingPhotoPurchases.length > 0 && (
                <p className="mt-2 text-center text-xs text-amber-700">
                  Attach the photo(s) above first.
                </p>
              )}
            </>
          )}
      </div>
    </div>
  );
}

export default Shopping;
