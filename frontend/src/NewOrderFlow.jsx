import { useState } from "react";
import { api } from "./api";
import Button from "./components/Button";
import Card from "./components/Card";
import Icon from "./components/Icon";
import Input from "./components/Input";
import MarketPicker from "./components/MarketPicker";
import ListBuilder from "./components/ListBuilder";

// Mirrors app/orders/fees.py's flat placeholders/policy (DELIVERY_FEE_FLAT,
// COMBINED_BASE_FEE, DEPOSIT_THRESHOLD, DEPOSIT_RATE) purely for the
// pre-order quote preview below - the order doesn't exist yet at that point,
// so there's no backend-computed estimate to show. The real, authoritative
// numbers come back from POST /orders the moment "Place order" is pressed,
// and everything after that (deposit banner, cap, shopping) reads from the
// real order, not this preview.
const DELIVERY_QUOTE = 3600;
const COMBINED_FEE_ESTIMATE = 2000;
const DEPOSIT_THRESHOLD = 30000;
const DEPOSIT_RATE = 0.2;

// Order: market -> list -> address -> quote -> (create order, drop the
// submitted list into its chat, hand off). The list builder is a standalone
// composer with no chat/agent framing - there IS no agent yet at that point.
// Payment (if a deposit is due) and the chat itself both happen on the very
// next screen (OrderDetail, unchanged), which already shows the deposit
// banner and the real Chat - keyed to whatever agent auto-assignment landed,
// exactly as it did before this reorder.
function NewOrderFlow({ user, markets, marketsLoading, onCancel, onOrderPlaced }) {
  const [step, setStep] = useState("market"); // market | list | address | quote
  const [market, setMarket] = useState(null);
  const [stagedList, setStagedList] = useState(null); // { goodsTotal, pricedTotal, unstructuredTotal, items, ...raw for edit }
  // Prefill with the customer's saved default, if they set one during
  // profile setup (Phase 7's "offer the profile default").
  const [address, setAddress] = useState(user?.default_delivery_address || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function handlePickMarket(m) {
    setMarket(m);
    setStep("list");
  }

  function handleListContinue(payload) {
    setStagedList(payload);
    setStep("address");
  }

  function summarize(list) {
    const lines = list.items.map((it, i) => {
      const qty = it.quantity ? ` x${it.quantity}` : "";
      const price = it.listed_price != null ? ` — ₦${it.listed_price}${qty}` : "";
      return `${i + 1}. ${it.description}${price}`;
    });
    return [
      "Market list",
      ...lines,
      `Goods total: ₦${Number(list.goodsTotal).toFixed(2)}`,
    ].join("\n");
  }

  async function handlePlaceOrder() {
    setError(""); setBusy(true);
    let created;
    try {
      created = await api.createOrder({
        market_id: market.id,
        delivery_address: address,
        // Only the un-priced (budget) remainder — the backend adds this to
        // the sum of each item's own listed_price, so a mixed list of
        // priced + budget items still totals correctly. See the comment on
        // create_order in app/orders/service.py.
        listed_items_total: stagedList.unstructuredTotal,
        items: stagedList.items,
      });
    } catch (e) {
      setError("Could not place order: " + e.message);
      setBusy(false);
      return;
    }
    try {
      // Pre-populate the now-real, agent-linked chat with the submitted
      // list. Best-effort: the order is already placed at this point, so a
      // failed intro message shouldn't block the customer from reaching it.
      await api.sendMessage(created.id, { text: summarize(stagedList) });
    } catch {
      // ignore — the order and its item list are already saved regardless.
    }
    onOrderPlaced(created.id);
  }

  if (step === "market") {
    return <MarketPicker markets={markets} loading={marketsLoading} onSelect={handlePickMarket} onCancel={onCancel} />;
  }

  if (step === "list") {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Build your list</h1>
            <p className="mt-1 text-slate-500">Shopping at {market.name}, {market.city}.</p>
          </div>
          <Button variant="neutral" onClick={() => setStep("market")}>Change market</Button>
        </div>
        <div className="max-w-xl">
          <ListBuilder initial={stagedList} onContinue={handleListContinue} />
        </div>
      </div>
    );
  }

  if (step === "address") {
    const savedAddress = user?.default_delivery_address;
    return (
      <div className="max-w-md py-4">
        <Button variant="neutral" onClick={() => setStep("list")} className="mb-4">← Edit list</Button>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">Delivery address</h1>
        <p className="mb-6 text-slate-500">Where should we deliver your order?</p>

        <Card>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Icon name="pin" className="h-4 w-4 text-brand-orange" />
              Delivery address
            </span>
            <Input
              placeholder="e.g. 12 Allen Avenue, Ikeja — a landmark helps"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>

          {/* Only surfaces once they've edited away from their saved
              default (it's prefilled from it already) - an easy way back,
              not a redundant suggestion of what's already in the box. */}
          {savedAddress && address.trim() !== savedAddress && (
            <button
              onClick={() => setAddress(savedAddress)}
              className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand-orange hover:underline"
            >
              <Icon name="pin" className="h-3.5 w-3.5" />
              Use saved address: {savedAddress}
            </button>
          )}

          <Button onClick={() => setStep("quote")} disabled={!address.trim()} fullWidth className="mt-4">
            Continue
          </Button>
        </Card>
      </div>
    );
  }

  // step === "quote" — a PREVIEW built from the staged list, since no order
  // exists yet. "Place order" is what actually creates it.
  const goodsTotal = Number(stagedList.goodsTotal);
  const estimatedValue = goodsTotal + DELIVERY_QUOTE + COMBINED_FEE_ESTIMATE;
  // Mirrors orders.fees.required_deposit: a flagged customer (a prior
  // payment window lapsed) pays 100% of the FULL estimate regardless of
  // size, not the normal 20%-of-goods-above-threshold rule. Without this
  // branch a flagged customer under the threshold would see "no deposit"
  // here and then hit a 100% wall the moment the real order is created.
  const mustPrepay = !!user?.must_prepay;
  const depositAmount = mustPrepay
    ? estimatedValue
    : estimatedValue > DEPOSIT_THRESHOLD
      ? goodsTotal * DEPOSIT_RATE
      : 0;

  return (
    <div className="mx-auto max-w-md py-4">
      <Button variant="neutral" onClick={() => setStep("address")} className="mb-4">← Back</Button>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">Review your quote</h1>
      <p className="mb-6 text-slate-500">Confirm to place your order.</p>

      <Card className="border-2 border-brand-orange">
        <div className="space-y-1 text-slate-700">
          <div className="flex justify-between">
            <span>Goods total</span>
            <span className="font-semibold">₦{goodsTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery quote</span>
            <span className="font-semibold">₦{DELIVERY_QUOTE.toFixed(2)}</span>
          </div>
        </div>
        {/* No grand total / service fee shown here on purpose: the service
            fee is time-based (₦50/min past the first 30) and isn't known
            until shopping actually finishes, so a number shown now would
            not match the real bill later - it'd look like things "don't add
            up." estimatedValue (goods + delivery + a flat fee guess) still
            drives the deposit-threshold check below; it's just never
            displayed as a total. The real grand total + itemized fee only
            ever appear once, on the finished order. */}
        <p className="mt-2 text-xs text-slate-400">Service fee calculated at checkout.</p>

        {depositAmount > 0 && (
          <p className="mt-3 mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {mustPrepay ? (
              <>Because a previous order wasn't paid, this order requires full payment upfront — ₦{depositAmount.toFixed(2)}.</>
            ) : (
              <>This order is over ₦30,000 — a 20% deposit (₦{depositAmount.toFixed(2)}) will be required before shopping can start.</>
            )}
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <Button onClick={handlePlaceOrder} busy={busy} fullWidth className="mt-3 text-lg">
          Place order
        </Button>
      </Card>
    </div>
  );
}

export default NewOrderFlow;
