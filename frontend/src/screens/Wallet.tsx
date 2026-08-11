'use client';

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";

function TransactionRow({ tx }: any) {
  const credit = tx.direction === "credit";
  const date = tx.created_at ? new Date(tx.created_at).toLocaleString() : null;
  return (
    <div className="flex items-center gap-3 py-3">
      <span
        className={
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold " +
          (credit ? "bg-brand-green/10 text-brand-green" : "bg-red-50 text-red-600")
        }
      >
        {credit ? "+" : "−"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-slate-900">{tx.note || (credit ? "Wallet credit" : "Wallet debit")}</div>
        {date && <div className="text-xs text-slate-400">{date}</div>}
      </div>
      <div className="shrink-0 text-right">
        <div className={"font-bold " + (credit ? "text-brand-green" : "text-red-600")}>
          {credit ? "+" : "−"}₦{tx.amount}
        </div>
        <div className="text-xs text-slate-400">Bal. ₦{tx.balance_after}</div>
      </div>
    </div>
  );
}

function Wallet() {
  const [balance, setBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function loadBalance() {
    try {
      const data = await api.getWalletBalance();
      setBalance(data.balance);
    } catch (e) {
      setError("Could not load wallet balance. (" + e.message + ")");
    }
  }

  async function loadTransactions() {
    try {
      setTransactions(await api.getWalletTransactions());
    } catch {
      setTransactions([]);
    }
  }

  // On return from Paystack checkout, the URL carries ?funded=<reference>
  // (set via callback_url in fundWalletInit). The webhook can't reach a local
  // dev server, and can lag even in production, so reconcile directly here
  // instead of waiting on it.
  useEffect(() => {
    loadTransactions();
    const funded = new URLSearchParams(window.location.search).get("funded");
    if (!funded) {
      loadBalance();
      return;
    }
    setVerifying(true);
    api.verifyWalletFunding(funded)
      .then((result) => {
        setBalance(result.balance);
        if (!result.verified) {
          setError("Payment not confirmed yet. If you were charged, try refreshing shortly.");
        } else {
          loadTransactions();
        }
      })
      .catch((e) => setError("Could not confirm payment: " + e.message))
      .finally(() => {
        setVerifying(false);
        // Drop the query param so a manual refresh doesn't re-trigger this.
        window.history.replaceState(null, "", window.location.pathname);
      });
  }, []);

  // Production path: Paystack takes over from here, the callback (and, in
  // production, the webhook) brings the customer back to reconcile above.
  async function handleFund() {
    setError(""); setBusy(true);
    try {
      const data = await api.fundWalletInit(amount);
      window.location.href = data.authorization_url;
    } catch (e) {
      setError("Could not start funding: " + e.message);
      setBusy(false);
    }
  }

  async function handleDevTopUp() {
    setError(""); setBusy(true);
    try {
      await api.fundWalletDev(amount);
      setAmount("");
      await Promise.all([loadBalance(), loadTransactions()]);
    } catch (e) {
      setError("Dev top-up failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Wallet</h1>
      <p className="mb-6 text-slate-500">Fund your wallet and see where the money's gone.</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        {/* Left column: balance + fund action — a comfortable fixed width on
            desktop, never stretched edge-to-edge even though the page is wide. */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-brand-orange to-brand-orange-dark p-5 text-white shadow-card">
            <div className="text-sm text-white/80">Wallet balance</div>
            <div className="text-4xl font-extrabold">{balance != null ? `₦${balance}` : "…"}</div>
            {verifying && <p className="mt-2 text-sm text-white/90">Confirming your payment…</p>}
          </div>

          <Card>
            <p className="mb-3 font-bold text-slate-900">Fund wallet</p>

            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <Input
              placeholder="Amount (₦)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mb-3"
            />

            <Button onClick={handleFund} busy={busy} disabled={busy || !amount} fullWidth>
              Fund by transfer / card
            </Button>

            {/* Dev-only: skips Paystack entirely so funding can be tested without it. */}
            {process.env.NODE_ENV !== "production" && (
              <Button
                variant="neutral"
                onClick={handleDevTopUp}
                busy={busy}
                disabled={busy || !amount}
                fullWidth
                className="mt-2 border border-dashed border-slate-300 text-sm"
              >
                Dev top-up (test only)
              </Button>
            )}
          </Card>
        </div>

        {/* Right column (below, on mobile): transaction history — funding
            top-ups and order payments, newest first, from the wallet ledger. */}
        <Card>
          <p className="mb-1 font-bold text-slate-900">Transaction history</p>
          <p className="mb-2 text-sm text-slate-500">Every top-up, order payment, and refund.</p>

          {transactions === null && (
            <div className="divide-y divide-slate-100">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-16 shrink-0" />
                </div>
              ))}
            </div>
          )}

          {transactions?.length === 0 && (
            <EmptyState icon="wallet" title="No transactions yet" subtitle="Fund your wallet to get started." />
          )}

          {transactions && transactions.length > 0 && (
            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default Wallet;
