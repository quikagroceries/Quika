'use client';

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import Input from "@/components/Input";
import { CardSkeleton } from "@/components/Skeleton";
import { LOW_FLOAT_BALANCE } from "@/lib/adminUtils";

function TopUpForm({ market, onSubmit, onCancel, busy, error }: any) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <Input placeholder="Amount (₦)" value={amount} onChange={(e) => setAmount(e.target.value)} className="mb-2 bg-white" />
      <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="mb-2 bg-white" />
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button variant="neutral" onClick={onCancel} disabled={busy} className="flex-1 text-sm">Cancel</Button>
        <Button onClick={() => onSubmit(market.id, amount, note)} busy={busy} disabled={!amount} className="flex-1 text-sm">
          Top up {market.name}
        </Button>
      </div>
    </div>
  );
}

function AdminFloat() {
  const [markets, setMarkets] = useState<any>(null);
  const [balances, setBalances] = useState<any>({});
  const [toppingUpId, setToppingUpId] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");

  // Movement history for one market at a time.
  const [historyMarketId, setHistoryMarketId] = useState("");
  const [history, setHistory] = useState<any>(null);

  // Transfer between pools - money-critical, so it's a deliberate two-step
  // action with a clear before/after preview, not a single tap.
  const [fromMarketId, setFromMarketId] = useState("");
  const [toMarketId, setToMarketId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [confirmingTransfer, setConfirmingTransfer] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferResult, setTransferResult] = useState<any>(null);

  async function refresh() {
    try {
      const list = await api.getAllMarkets();
      setMarkets(list);
      setError("");
      const results = await Promise.all(
        list.map((m) => api.floatBalance(m.id).catch(() => ({ balance: null })))
      );
      const map = {};
      list.forEach((m, i) => { map[m.id] = results[i].balance; });
      setBalances(map);
      if (!historyMarketId && list.length > 0) setHistoryMarketId(list[0].id);
    } catch (e) {
      setError("Could not load float data. (" + e.message + ")");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot load on mount; refresh closes over historyMarketId only to seed its initial value, not to react to later changes
  }, []);

  useEffect(() => {
    if (!historyMarketId) return;
    api.getAdminFloat(historyMarketId).then(setHistory).catch(() => setHistory(null));
  }, [historyMarketId]);

  async function handleTopUp(marketId, amount, note) {
    setFormError(""); setBusy(true);
    try {
      await api.floatTopUp(marketId, amount, note || undefined);
      setToppingUpId(null);
      await refresh();
      if (marketId === historyMarketId) api.getAdminFloat(marketId).then(setHistory).catch(() => {});
    } catch (e) {
      setFormError("Top-up failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleTransfer() {
    setTransferError(""); setTransferBusy(true);
    try {
      const result = await api.floatTransfer({
        from_market_id: fromMarketId, to_market_id: toMarketId,
        amount: transferAmount, note: transferNote || undefined,
      });
      setTransferResult(result);
      setConfirmingTransfer(false);
      setTransferAmount(""); setTransferNote("");
      await refresh();
      if ([fromMarketId, toMarketId].includes(historyMarketId)) {
        api.getAdminFloat(historyMarketId).then(setHistory).catch(() => {});
      }
    } catch (e) {
      setTransferError("Transfer failed: " + e.message);
    } finally {
      setTransferBusy(false);
    }
  }

  const marketName = (id) => markets?.find((m) => m.id === id)?.name || id;
  const fromBalance = fromMarketId ? Number(balances[fromMarketId] ?? 0) : null;
  const insufficientSource = fromBalance != null && transferAmount && Number(transferAmount) > fromBalance;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Float</h1>
      <p className="mb-6 text-slate-500">Working capital per market — top up, move between pools, and the movement trail.</p>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {markets === null ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {markets.map((m) => {
            const balance = balances[m.id];
            const low = balance != null && Number(balance) < LOW_FLOAT_BALANCE;
            return (
              <Card key={m.id} className={low ? "border-2 border-red-400" : ""}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-bold text-slate-900">{m.name}</span>
                  {low && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
                      <Icon name="alert" className="h-3.5 w-3.5" /> Low
                    </span>
                  )}
                </div>
                <div className={"mt-2 text-2xl font-extrabold " + (low ? "text-red-600" : "text-slate-900")}>
                  {balance != null ? `₦${balance}` : "—"}
                </div>
                {toppingUpId === m.id ? (
                  <TopUpForm
                    market={m}
                    onSubmit={handleTopUp}
                    onCancel={() => { setToppingUpId(null); setFormError(""); }}
                    busy={busy}
                    error={formError}
                  />
                ) : (
                  <Button variant="neutral" onClick={() => { setToppingUpId(m.id); setFormError(""); }} className="mt-3 w-full text-sm">
                    Top up
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Transfer between pools */}
      <Card className="mb-8">
        <p className="mb-3 font-bold text-slate-900">Move float between pools</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">From</span>
            <select
              value={fromMarketId}
              onChange={(e) => { setFromMarketId(e.target.value); setConfirmingTransfer(false); }}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 text-base text-slate-900"
            >
              <option value="">Select a market…</option>
              {markets?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">To</span>
            <select
              value={toMarketId}
              onChange={(e) => { setToMarketId(e.target.value); setConfirmingTransfer(false); }}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 text-base text-slate-900"
            >
              <option value="">Select a market…</option>
              {markets?.filter((m) => m.id !== fromMarketId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
        </div>

        {fromMarketId && (
          <p className="mt-2 text-sm text-slate-500">
            {marketName(fromMarketId)}'s current balance: <span className="font-semibold text-slate-900">₦{fromBalance?.toFixed(2)}</span>
          </p>
        )}

        <Input
          placeholder="Amount (₦)"
          value={transferAmount}
          onChange={(e) => { setTransferAmount(e.target.value); setConfirmingTransfer(false); }}
          className="mt-3"
        />
        <Input
          placeholder="Note (optional)"
          value={transferNote}
          onChange={(e) => setTransferNote(e.target.value)}
          className="mt-2"
        />

        {insufficientSource && (
          <p className="mt-2 text-sm text-red-600">This exceeds {marketName(fromMarketId)}'s current balance.</p>
        )}
        {transferError && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{transferError}</p>}

        {!confirmingTransfer ? (
          <Button
            onClick={() => setConfirmingTransfer(true)}
            disabled={!fromMarketId || !toMarketId || !transferAmount || insufficientSource}
            fullWidth
            className="mt-3"
          >
            Review transfer
          </Button>
        ) : (
          <div className="mt-3 rounded-xl border-2 border-brand-orange bg-white p-3">
            <p className="mb-2 text-sm font-semibold text-slate-800">
              Move ₦{Number(transferAmount).toFixed(2)} from {marketName(fromMarketId)} to {marketName(toMarketId)}?
            </p>
            <div className="mb-3 space-y-1 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>{marketName(fromMarketId)}</span>
                <span>₦{fromBalance?.toFixed(2)} → ₦{(fromBalance - Number(transferAmount)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{marketName(toMarketId)}</span>
                <span>₦{Number(balances[toMarketId] ?? 0).toFixed(2)} → ₦{(Number(balances[toMarketId] ?? 0) + Number(transferAmount)).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="neutral" onClick={() => setConfirmingTransfer(false)} disabled={transferBusy} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleTransfer} busy={transferBusy} className="flex-1">
                Confirm transfer
              </Button>
            </div>
          </div>
        )}

        {transferResult && !confirmingTransfer && (
          <p className="mt-3 rounded-lg bg-brand-green/10 px-3 py-2 text-sm font-semibold text-brand-green">
            Moved ₦{transferResult.amount} — {marketName(transferResult.from_market_id)} now ₦{transferResult.from_balance}, {marketName(transferResult.to_market_id)} now ₦{transferResult.to_balance}.
          </p>
        )}
      </Card>

      {/* Movement history for a selected market */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold text-slate-900">Movement history</p>
          <select
            value={historyMarketId}
            onChange={(e) => setHistoryMarketId(e.target.value)}
            className="min-h-[36px] rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
          >
            {markets?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        {!history ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : history.recent_movements.length === 0 ? (
          <p className="text-sm text-slate-400">No movements recorded yet for this market.</p>
        ) : (
          <div className="space-y-2">
            {history.recent_movements.map((m, i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-2 text-sm last:border-0">
                <div>
                  <span className={"font-semibold " + (m.direction === "credit" ? "text-brand-green" : "text-red-600")}>
                    {m.direction === "credit" ? "+" : "−"}₦{m.amount}
                  </span>
                  <span className="ml-2 text-slate-500">{m.note || "—"}</span>
                </div>
                <div className="shrink-0 text-right text-slate-400">
                  <div>Bal. ₦{m.balance_after}</div>
                  <div>{m.at ? new Date(m.at).toLocaleString() : ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminFloat;
