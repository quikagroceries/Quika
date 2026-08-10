import { useState, useEffect, useRef } from "react";
import { api } from "./api";
import ChatPanel from "./ChatPanel";
import DeliveryTracking from "./DeliveryTracking";
import Button from "./components/Button";
import Card from "./components/Card";
import Input from "./components/Input";
import PurchaseChecklist from "./components/PurchaseChecklist";
import StatusBadge from "./components/StatusBadge";
import PaymentChooser from "./components/PaymentChooser";
import StarRating from "./components/StarRating";
import { isChatAvailable, isRateable } from "./orderStatus";

const POLL_MS = 5000;

// Mirrors app/orders/fees.py's flat placeholders (DELIVERY_FEE_FLAT,
// COMBINED_BASE_FEE) - same constants already duplicated in NewOrderFlow.jsx
// for the same reason: pre-shopping, the API only returns the single
// combined estimated_value, not a delivery/fee split, so these let the
// pre-shopping estimate card below show a believable breakdown.
const DELIVERY_QUOTE = 3600;
const COMBINED_FEE_ESTIMATE = 2000;

// Statuses before finish_shopping has ever run - items_total/combined_fee/
// delivery_fee/grand_total are all still their unset 0.00 defaults, so the
// "final bill" card would be actively misleading (₦0.00 everywhere, and
// amount_due would even go negative once a deposit's been paid against a
// grand_total that's still zero). Show the pre-shopping estimate instead.
const UNPRICED_STATUSES = new Set(["draft", "proposed", "agent_assigned", "shopping"]);

// "Post-payment" per the user's own spec - PAID and every status after it,
// not merely post-shopping (which already includes awaiting_payment, where
// nothing's been bought-for-real yet either). Also exactly the range the
// status/tracking screen covers - packaging starts the moment it's paid, so
// there's no gap where the customer is left without a status screen.
const PAID_OR_LATER = new Set(["paid", "packed", "out_for_delivery", "delivered", "closed"]);


// On return from a Paystack redirect, the URL carries one of these,
// depending on which payment moment sent the customer there.
function pendingCheckoutRef() {
  const params = new URLSearchParams(window.location.search);
  const balance = params.get("order_ref");
  const deposit = params.get("order_deposit_ref");
  return balance ? { kind: "balance", reference: balance } : deposit ? { kind: "deposit", reference: deposit } : null;
}

function OrderDetail({ orderId, onBack, onTopUpWallet }) {
  const [order, setOrder] = useState(null);
  const [authorization, setAuthorization] = useState(null);
  // An unread overage_approval notification for THIS order, if any - drives
  // the persistent alert state below so a dismissed/missed toast still
  // leaves a clear "your agent needs approval" signal on the order itself.
  const [pendingOverage, setPendingOverage] = useState(null);
  const [raiseAmount, setRaiseAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [purchases, setPurchases] = useState([]);
  // Propose->accept assignment: who's currently proposed, and the message
  // from the last "see another" outcome (only-option / nobody-left), which
  // needs to persist on screen rather than flash-and-vanish like a toast.
  const [proposedAgent, setProposedAgent] = useState(null);
  const [assignmentNotice, setAssignmentNotice] = useState("");
  // #7: agent rating - `rating` is the already-submitted one (if any), null
  // while none exists yet. draftStars/draftComment hold the in-progress form.
  const [rating, setRating] = useState(null);
  const [draftStars, setDraftStars] = useState(0);
  const [draftComment, setDraftComment] = useState("");
  // Lazy init from the URL - true only when we've just landed back from
  // Paystack for THIS payment, so the effect below has something to verify.
  const [verifyingPayment, setVerifyingPayment] = useState(() => pendingCheckoutRef() !== null);
  const loadedRef = useRef(false); // has the FIRST load ever succeeded?

  // While shopping is in progress there's a live spending cap to show.
  async function loadAuthorization() {
    try {
      setAuthorization(await api.getAuthorization(orderId));
    } catch {
      setAuthorization(null);
    }
  }

  // Who's currently proposed, while the order is awaiting the customer's
  // accept/see-another decision.
  async function loadProposedAgent() {
    try {
      setProposedAgent(await api.getProposedAgent(orderId));
    } catch {
      setProposedAgent(null);
    }
  }

  // Mirrors Notifications.jsx's toast filter (unread overage_approval), just
  // scoped to this order and persisted on the card instead of a dismissable
  // pop-up - see the comment on pendingOverage above.
  async function loadPendingOverage() {
    try {
      const notes = await api.getNotifications();
      const match = notes.find(
        (n) => !n.is_read && n.kind === "overage_approval" && n.order_id === orderId
      );
      setPendingOverage(match || null);
    } catch {
      // best-effort - don't blank out an already-shown alert on a transient failure
    }
  }

  // #7: whether this order already has a rating - null means "not yet rated".
  async function loadRating() {
    try {
      setRating(await api.getRating(orderId));
    } catch {
      setRating(null);
    }
  }

  // Reload the order (and authorization, if relevant) from the server. Used
  // both for the initial load and for periodic polling below, so changes the
  // OTHER participant makes (agent/customer) show up here without a manual
  // reload - never throws: a background poll failing shouldn't blank out an
  // already-working screen, so a load failure only surfaces if nothing has
  // ever loaded successfully yet.
  async function refresh() {
    try {
      const fresh = await api.getOrder(orderId);
      setOrder(fresh);
      loadedRef.current = true;
      setError("");
      if (fresh.status === "shopping") {
        await loadAuthorization();
        await loadPendingOverage();
      }
      if (fresh.status === "proposed") {
        await loadProposedAgent();
      }
      if (isRateable(fresh.status)) {
        await loadRating();
      }
    } catch {
      if (!loadedRef.current) setError("Could not load the order.");
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one interval per orderId, matches Chat.jsx's poll pattern
  }, [orderId]);

  useEffect(() => {
    api.getWalletBalance().then((d) => setWalletBalance(d.balance)).catch(() => {});
  }, []);

  // Purchase photos never change once shopping's finished, so this only
  // needs to run once the order first reaches PAID (not on every poll tick).
  useEffect(() => {
    if (!order || !PAID_OR_LATER.has(order.status)) return;
    api.getPurchases(orderId).then(setPurchases).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when status crosses into paid-or-later
  }, [orderId, order?.status]);

  // On return from a Paystack redirect (either payment moment), reconcile
  // right away instead of waiting on a webhook that may never reach a local
  // dev server and can lag even in production - same reasoning as Wallet.jsx's
  // ?funded= handling, just keyed to whichever of the two references is in
  // the URL. Runs once, for the specific payment this screen was reopened for.
  useEffect(() => {
    const pending = pendingCheckoutRef();
    if (!pending) return;
    const verify = pending.kind === "deposit"
      ? api.verifyDepositCheckout(orderId, pending.reference)
      : api.verifyBalanceCheckout(orderId, pending.reference);
    verify
      .then(() => refresh())
      .catch(() => setError("Could not confirm payment yet. If you were charged, this will update shortly."))
      .finally(() => {
        setVerifyingPayment(false);
        window.history.replaceState(null, "", window.location.pathname);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, right after returning from Paystack for this order
  }, []);

  async function handlePayBalanceWallet() {
    setError(""); setBusy(true);
    try {
      await api.payBalance(orderId);
      await refresh();
    } catch (e) {
      setError("Payment failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePayBalanceTransfer() {
    setError(""); setBusy(true);
    try {
      const data = await api.checkoutBalance(orderId);
      // The app has no client-side router, so the full-page redirect to
      // Paystack and back would otherwise drop straight into the order list
      // with no memory of which order this was - CustomerHome reads this on
      // its next mount to reopen this exact order.
      localStorage.setItem("quika_pending_order_return", orderId);
      window.location.href = data.authorization_url;
    } catch (e) {
      setError("Could not start payment: " + e.message);
      setBusy(false);
    }
  }

  async function handlePayDepositWallet() {
    setError(""); setBusy(true);
    try {
      await api.payDeposit(orderId);
      await refresh();
    } catch (e) {
      setError("Deposit payment failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePayDepositTransfer() {
    setError(""); setBusy(true);
    try {
      const data = await api.checkoutDeposit(orderId);
      localStorage.setItem("quika_pending_order_return", orderId);
      window.location.href = data.authorization_url;
    } catch (e) {
      setError("Could not start payment: " + e.message);
      setBusy(false);
    }
  }

  async function handleDecide(itemId, decision) {
    setError(""); setBusy(true);
    try {
      await api.decideItem(orderId, itemId, decision);
      await refresh();
    } catch (e) {
      setError("Could not record your choice: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDelivery() {
    setError(""); setBusy(true);
    try {
      await api.confirmDelivery(orderId);
      await refresh();
    } catch (e) {
      setError("Could not confirm delivery: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // #7: feedback only - never touches assignment or agent pay, purely a
  // rating record for this order.
  async function handleSubmitRating() {
    setError(""); setBusy(true);
    try {
      await api.rateAgent(orderId, draftStars, draftComment.trim() || null);
      setDraftStars(0);
      setDraftComment("");
      await loadRating();
    } catch (e) {
      setError("Could not submit your rating: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAcceptAgent() {
    setError(""); setBusy(true);
    try {
      await api.acceptProposedAgent(orderId);
      setAssignmentNotice("");
      setProposedAgent(null);
      await refresh();
    } catch (e) {
      setError("Could not accept this agent: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSeeAnother() {
    setError(""); setBusy(true);
    try {
      const result = await api.seeAnotherAgent(orderId);
      if (result.outcome === "only_option") {
        setAssignmentNotice(`No other agents available — ${proposedAgent?.full_name || "this agent"} is your only option.`);
      } else if (result.outcome === "none") {
        setAssignmentNotice("No agents available right now. Please try again shortly.");
      } else {
        setAssignmentNotice("");
      }
      setOrder(result.order);
      if (result.order.status === "proposed") await loadProposedAgent();
      else setProposedAgent(null);
    } catch (e) {
      setError("Could not look for another agent: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRaiseCap() {
    setError(""); setBusy(true);
    try {
      await api.raiseCap(orderId, raiseAmount);
      if (pendingOverage) await api.markRead(pendingOverage.id).catch(() => {});
      setRaiseAmount("");
      setPendingOverage(null);
      await refresh();
    } catch (e) {
      setError("Could not approve increase: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // #5: per-item overage - a single item's real price came in above what
  // was listed for it (distinct from the whole-order cap above).
  async function handleItemOverageDecide(itemId, decision) {
    setError(""); setBusy(true);
    try {
      await api.decideItemOverage(orderId, itemId, decision);
      await refresh();
    } catch (e) {
      setError("Could not record your decision: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
        <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p>Loading order…</p>
      </div>
    );
  }

  const items = order.items || [];
  const depositPaid = !!order.deposit_paid_at;
  const needsDeposit = Number(order.deposit_amount) > 0 && !depositPaid;
  const isPriced = !UNPRICED_STATUSES.has(order.status);
  // Amount due must never render negative - a paid deposit can equal but
  // never exceed grand_total once shopping's finished (finish_shopping caps
  // it), but clamp defensively anyway rather than trust that invariant here.
  const amountDue = isPriced
    ? Math.max(0, Number(order.grand_total) - (depositPaid ? Number(order.deposit_amount) : 0))
    : 0;
  // Summary, not a dump: combined fee + EMTL + transfer fees fold into one
  // "Fees" line for the customer. The full per-transfer breakdown still
  // exists in the database untouched - this just isn't the screen for it.
  const fees = Number(order.combined_fee) + Number(order.emtl_total) + Number(order.transfer_fees_total);
  const goodsEstimate = Math.max(0, Number(order.estimated_value) - DELIVERY_QUOTE - COMBINED_FEE_ESTIMATE);
  // Derived from the REAL order, never hardcoded - a flagged (must_prepay)
  // customer's deposit is 100% of the estimate, not the normal 20%, and a
  // fixed "20%" string here would just be wrong for them. See
  // orders.fees.required_deposit for the source of truth this mirrors.
  const depositPct = Number(order.estimated_value) > 0
    ? Math.round((Number(order.deposit_amount) / Number(order.estimated_value)) * 100)
    : 0;
  const isPaidOrLater = PAID_OR_LATER.has(order.status);
  const pendingDecisionCount = items.filter((it) => it.availability === "unavailable").length;
  // #5: items with a pending per-item overage - derived straight from the
  // order itself (not a notification fetch), so it's always in sync with
  // what the agent can actually see, and survives a missed/dismissed toast.
  const pendingItemOverages = items.filter((it) => it.availability === "overage_pending");
  // #1: chat is scoped to the shopping window - see isChatAvailable.
  const showChat = isChatAvailable(order.status);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Button variant="neutral" onClick={onBack}>← Back</Button>
        {showChat && <ChatPanel orderId={orderId} />}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Order {order.id.slice(0, 8)}…</h2>
        <StatusBadge status={order.status} />
      </div>

      {verifyingPayment && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">Confirming your payment…</p>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="space-y-4">
        {/* Propose->accept: shown only while the order is awaiting the
            customer's decision on the proposed agent. No photo infrastructure
            exists in this app, so only name/phone are shown. */}
        {order.status === "proposed" && (
          <Card className={assignmentNotice ? "border-2 border-amber-400 bg-amber-50/60" : ""}>
            <p className="mb-2 font-bold text-slate-900">Your shopping agent</p>
            {proposedAgent ? (
              <>
                <p className="mb-1 text-slate-800">
                  <span className="font-semibold">{proposedAgent.full_name || "Unnamed agent"}</span>
                </p>
                <p className="mb-3 text-sm text-slate-500">{proposedAgent.phone}</p>
              </>
            ) : (
              <p className="mb-3 text-sm text-slate-500">Looking for an available agent…</p>
            )}
            {assignmentNotice && (
              <p className="mb-3 text-sm text-amber-700">{assignmentNotice}</p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleAcceptAgent} busy={busy} disabled={!proposedAgent} className="flex-1">
                Accept
              </Button>
              <Button variant="neutral" onClick={handleSeeAnother} busy={busy} disabled={!proposedAgent} className="flex-1">
                See another
              </Button>
            </div>
          </Card>
        )}

        {/* #5: per-item overage - persistent, must-respond, one card per
            pending item so several overages at once are never hidden behind
            each other. The agent keeps shopping other items while this
            waits; an unanswered one is simply skipped, never bought. */}
        {pendingItemOverages.map((item) => {
          const extra = Number(item.overage_requested_price) - Number(item.listed_price);
          return (
            <Card key={item.id} className="border-2 border-amber-400 bg-amber-50/60">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                Price approval needed
              </p>
              <p className="mb-1 text-slate-800">
                <span className="font-semibold">{item.description}</span> costs{" "}
                <span className="font-semibold">₦{item.overage_requested_price}</span> at the stall —
                ₦{extra.toFixed(2)} more than the ₦{item.listed_price} you listed.
              </p>
              <p className="mb-3 text-sm text-slate-500">
                You can hop on a call to confirm the price with the seller directly.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleItemOverageDecide(item.id, "approved")}
                  busy={busy}
                  className="flex-1"
                >
                  Approve extra ₦{extra.toFixed(2)}
                </Button>
                <Button
                  variant="neutral"
                  onClick={() => handleItemOverageDecide(item.id, "declined")}
                  busy={busy}
                  className="flex-1"
                >
                  Skip this item
                </Button>
              </div>
            </Card>
          );
        })}

        {/* Prominent: shopping can't start until this is paid (agent's
            start-shopping 402s otherwise) - this is the whole point of the gate. */}
        {needsDeposit && (
          <div className="rounded-xl border-2 border-brand-orange bg-white p-4 shadow-sm">
            <p className="mb-3 text-slate-800">
              <b className="text-slate-900">Deposit required:</b>{" "}
              {depositPct >= 99
                ? "full payment upfront (a previous order wasn't paid) before shopping can start."
                : `${depositPct}% upfront before shopping can start.`}
            </p>
            <PaymentChooser
              amountDue={Number(order.deposit_amount)}
              walletBalance={walletBalance}
              onPayWallet={handlePayDepositWallet}
              onPayTransfer={handlePayDepositTransfer}
              onTopUp={onTopUpWallet}
              busy={busy}
            />
          </div>
        )}

        {/* Status/tracking screen — vertical timeline, packaging countdown,
            packing photos, handover code, confirm-delivery action. Covers
            PAID onward, so the customer is never in the dark right after
            paying. */}
        {isPaidOrLater && (
          <DeliveryTracking
            order={order}
            onConfirmDelivery={handleConfirmDelivery}
            busy={busy}
          />
        )}

        {/* Aggregate signal so a decision-needed item is never just
            something to stumble across while scrolling the list below. */}
        {!isPaidOrLater && pendingDecisionCount > 0 && (
          <button
            onClick={() => {
              const first = items.find((it) => it.availability === "unavailable");
              if (first) document.getElementById(`item-${first.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="flex w-full items-center gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-left"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-white">
              {pendingDecisionCount}
            </span>
            <span className="font-semibold text-amber-800">
              {pendingDecisionCount === 1 ? "1 item needs your decision" : `${pendingDecisionCount} items need your decision`}
            </span>
          </button>
        )}

        {/* Phase 1: post-payment, the plain item list becomes a bought/not-
            bought checklist with each stall's purchase photo as proof.
            Before payment, keep the original list with decide-buttons. */}
        {isPaidOrLater ? (
          <PurchaseChecklist items={items} purchases={purchases} />
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <Card key={item.id} id={`item-${item.id}`} className="py-3">
                <div className="font-semibold text-slate-900">{item.description}</div>
                {item.requested_note && (
                  <div className="text-sm text-slate-500">{item.requested_note}</div>
                )}
                {item.confirmed_price != null && (
                  <div className="font-semibold text-brand-green">
                    Bought — ₦{item.confirmed_price}
                  </div>
                )}
                {item.availability === "unavailable" && (
                  <div className="mt-2">
                    <p className="mb-2 text-sm text-amber-700">
                      Not found at the market. What should we do?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleDecide(item.id, "buy_elsewhere")}
                        disabled={busy}
                        className="text-sm"
                      >
                        Buy elsewhere
                      </Button>
                      <Button
                        variant="neutral"
                        onClick={() => handleDecide(item.id, "dropped")}
                        disabled={busy}
                        className="text-sm"
                      >
                        Drop item
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Spending cap: only relevant while shopping is in progress. Alert
            state (amber border, headline, the agent's actual message)
            whenever there's an unread overage_approval for this order -
            persists here regardless of whether the toast was dismissed. */}
        {order.status === "shopping" && authorization && (
          <Card className={pendingOverage ? "border-2 border-amber-400 bg-amber-50/60" : ""}>
            {pendingOverage ? (
              <>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                  Your agent needs approval
                </p>
                <p className="mb-3 text-slate-800">{pendingOverage.message}</p>
              </>
            ) : (
              <p className="mb-2 font-bold text-slate-900">Spending approval</p>
            )}
            <div className="flex justify-between text-slate-700">
              <span>Cap</span>
              <span className="font-semibold">₦{authorization.cap}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Spent so far</span>
              <span className="font-semibold">₦{authorization.spent}</span>
            </div>
            <Input
              placeholder="Amount to approve (₦)"
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(e.target.value)}
              className="mt-3 mb-2"
            />
            <Button onClick={handleRaiseCap} busy={busy} disabled={!raiseAmount} fullWidth>
              {pendingOverage ? "Approve increase now" : "Approve increase"}
            </Button>
          </Card>
        )}

        {/* Money summary — a summary, not the raw per-transfer breakdown.
            The full ledger (every transfer, fee, EMTL line) stays in the
            database exactly as recorded; this is just the readable version.
            Pre-shopping, none of items_total/combined_fee/delivery_fee/
            grand_total exist yet (finish_shopping is what sets them) - show
            the estimate instead of a card full of misleading ₦0.00 lines. */}
        {isPriced ? (
          <Card>
            <div className="space-y-1 text-slate-700">
              <div className="flex justify-between"><span>Goods total</span><span className="font-semibold">₦{order.items_total}</span></div>
              <div className="flex justify-between"><span>Fees</span><span className="font-semibold">₦{fees.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span className="font-semibold">₦{order.delivery_fee}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-1 text-slate-900">
                <span className="font-semibold">Grand total</span>
                <span className="font-bold">₦{order.grand_total}</span>
              </div>
              {Number(order.deposit_amount) > 0 && (
                <div className="flex justify-between">
                  <span>Deposit</span>
                  <span className="font-semibold">₦{order.deposit_amount} {depositPaid ? "(paid)" : "(unpaid)"}</span>
                </div>
              )}
              <div className="flex justify-between text-lg text-slate-900">
                <span className="font-semibold">Amount due</span>
                <span className="font-bold">₦{amountDue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <StatusBadge status={order.status} />
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="space-y-1 text-slate-700">
              <div className="flex justify-between"><span>Goods estimate</span><span className="font-semibold">₦{goodsEstimate.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Delivery quote</span><span className="font-semibold">₦{DELIVERY_QUOTE.toFixed(2)}</span></div>
              {/* No grand total shown here on purpose - the service fee is
                  time-based and unknown until shopping finishes, so a number
                  shown now wouldn't match the real bill later. See the same
                  reasoning in NewOrderFlow.jsx's quote screen. */}
              {depositPaid && (
                <div className="flex justify-between">
                  <span>Deposit</span>
                  <span className="font-semibold">₦{order.deposit_amount} (paid)</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Status</span>
                <StatusBadge status={order.status} />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">Final fees and total are set once shopping is finished.</p>
          </Card>
        )}

        {order.status === "awaiting_payment" && (
          <Card>
            <p className="mb-3 text-lg font-bold text-slate-900">Pay balance</p>
            <PaymentChooser
              amountDue={amountDue}
              walletBalance={walletBalance}
              onPayWallet={handlePayBalanceWallet}
              onPayTransfer={handlePayBalanceTransfer}
              onTopUp={onTopUpWallet}
              busy={busy}
            />
          </Card>
        )}

        {/* #7: agent rating - customer feedback only, once the order is
            genuinely finished. Never feeds assignment or agent pay. */}
        {isRateable(order.status) && (
          <Card>
            {rating ? (
              <>
                <p className="mb-2 font-bold text-slate-900">Your rating</p>
                <StarRating value={rating.stars} readOnly size={22} />
                {rating.comment && <p className="mt-2 text-sm text-slate-600">{rating.comment}</p>}
              </>
            ) : (
              <>
                <p className="mb-2 font-bold text-slate-900">Rate your agent</p>
                <StarRating value={draftStars} onChange={setDraftStars} />
                <textarea
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value)}
                  placeholder="Optional comment"
                  rows={3}
                  className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-brand-orange"
                />
                <Button
                  onClick={handleSubmitRating}
                  busy={busy}
                  disabled={draftStars === 0}
                  fullWidth
                  className="mt-3"
                >
                  Submit rating
                </Button>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

export default OrderDetail;
