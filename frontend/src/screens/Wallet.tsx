'use client';

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import Input from "@/components/Input";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { ActiveOrderBanner } from "@/components/ActiveOrderBanner";
import { useAuth } from "@/components/AuthProvider";
import { formatDayDivider } from "@/lib/dateFormat";

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];

// A ledger row only carries direction (credit/debit) + an optional order_id
// - no explicit "kind" field - so top-up vs order-payment vs refund is
// inferred from that shape, the same way the rest of the app derives
// meaning from what the API actually gives it rather than wishing for a
// field that isn't there.
function categorizeTransaction(tx: any) {
  const credit = tx.direction === "credit";
  if (!tx.order_id) {
    return { icon: "wallet" as const, tone: "green" as const, label: tx.note || "Wallet top-up" };
  }
  if (credit) {
    return { icon: "check" as const, tone: "green" as const, label: tx.note || "Refund" };
  }
  return { icon: "basket" as const, tone: "ink" as const, label: tx.note || "Order payment" };
}

const TONE_WELL: Record<string, string> = {
  green: "bg-brand-green/10 text-brand-green",
  ink: "bg-[#f0eeeb] text-ink/70",
};

function TransactionRow({ tx }: any) {
  const credit = tx.direction === "credit";
  const { icon, tone, label } = categorizeTransaction(tx);
  const time = tx.created_at
    ? new Date(tx.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : null;
  return (
    <div className="flex items-center gap-3 py-3">
      <span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-full " + TONE_WELL[tone]}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-ink">{label}</div>
        {time && <div className="text-xs text-[#8a8178]">{time}</div>}
      </div>
      <div className="shrink-0 text-right">
        <div className={"font-bold tabular-nums " + (credit ? "text-brand-green" : "text-ink")}>
          {credit ? "+" : "−"}₦{Number(tx.amount).toLocaleString()}
        </div>
        <div className="text-xs text-[#8a8178]">Bal. ₦{Number(tx.balance_after).toLocaleString()}</div>
      </div>
    </div>
  );
}

// Newest-first list, grouped under "Today" / "Yesterday" / short-date
// dividers - same convention as Chat's day dividers, so a ledger with
// months of history doesn't read as one undifferentiated wall of rows.
function groupByDay(transactions: any[]) {
  const groups: { label: string; items: any[] }[] = [];
  for (const tx of transactions) {
    const label = tx.created_at ? formatDayDivider(tx.created_at) : "Earlier";
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(tx);
    } else {
      groups.push({ label, items: [tx] });
    }
  }
  return groups;
}

function Wallet() {
  const { user } = useAuth();
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

  const groups = transactions ? groupByDay(transactions) : [];

  // A real, already-fetched number (not a fabricated stat) - how much has
  // actually landed in the wallet this calendar month, so the card has one
  // meaningful line of context beyond the raw balance.
  const now = new Date();
  const creditedThisMonth = (transactions || [])
    .filter((tx: any) => {
      if (tx.direction !== "credit" || !tx.created_at) return false;
      const d = new Date(tx.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);
  const lastActivity = transactions?.[0]?.created_at
    ? new Date(transactions[0].created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "—";

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Wallet</h1>
          <p className="mt-1 text-[#6b635a]">Fund your wallet and see where the money&apos;s gone.</p>
        </div>
        <ActiveOrderBanner />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        {/* Left column: balance + fund action — a comfortable fixed width on
            desktop, never stretched edge-to-edge even though the page is wide. */}
        <div className="space-y-4">
          {/* Reads as an actual premium wallet card, not a colored info box:
              fine grain texture + soft light/shadow glows + a diagonal sheen
              sweep for depth, an embossed top edge, a large faint brand mark
              (the same way a physical card carries its issuer's logo), a
              chip-style icon well, and a cardholder line grounding it as
              THIS account's card. Green, not orange - the page's own CTAs
              ("Fund by transfer / card" right below it) are already orange,
              so a same-hued card just blurred into them - green (paired
              with a gold accent) both separates it visually and carries the
              money association orange never did. Shadow and border are
              tinted green too, so the card looks lit from its own color
              instead of sitting under a generic neutral drop shadow. */}
          <div className="market-grain panel-green-rich relative overflow-hidden rounded-[1.75rem] border border-gold/20 p-6 text-white shadow-[0_10px_20px_-6px_rgba(9,79,40,0.45),0_28px_56px_-16px_rgba(9,79,40,0.55)]">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <span className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
            <span className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-black/20 blur-3xl" />
            {/* Diagonal sheen sweep - a thin bright band crossing the card,
                the same trick premium card mockups (Apple Card, bank apps)
                use to suggest a brushed-metal / lacquered surface. */}
            <span
              className="pointer-events-none absolute -inset-y-8 left-[-10%] w-1/3 rotate-[18deg] bg-gradient-to-r from-transparent via-white/12 to-transparent"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rotate-12 opacity-[0.14]"
            />

            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                  <Icon name="wallet" className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/85">
                  Quika Wallet
                </span>
              </div>

              <div className="mt-7">
                <p className="text-sm font-semibold text-white/75">Available balance</p>
                <p className="font-display text-5xl font-extrabold tracking-tight">
                  <span className="mr-1 align-top text-2xl font-bold text-white/60">₦</span>
                  <span className="tabular-nums">{balance != null ? Number(balance).toLocaleString() : "…"}</span>
                </p>
                {verifying && <p className="mt-2 text-sm text-white/90">Confirming your payment…</p>}
              </div>

              {/* Two-up stat strip - a dashboard-like density step up from a
                  single caption line, and it's all real, already-fetched
                  data (not decoration invented for the sake of it). */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/10 px-3 py-2.5">
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/50">This month</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-white">
                    {creditedThisMonth > 0 ? `+₦${creditedThisMonth.toLocaleString()}` : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2.5">
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/50">Last activity</p>
                  <p className="mt-0.5 text-sm font-bold text-white">{lastActivity}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4">
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/50">Cardholder</p>
                  <p className="truncate text-sm font-bold text-white/90">
                    {user?.full_name || user?.phone || "—"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-gold/25 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-gold">
                  Active
                </span>
              </div>
            </div>
          </div>

          <Card>
            <p className="mb-3 font-display font-bold text-ink">Fund wallet</p>

            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div className="mb-3 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className={
                    "rounded-full px-3.5 py-1.5 text-sm font-bold transition " +
                    (amount === String(preset)
                      ? "bg-ink text-white"
                      : "bg-[#f0eeeb] text-ink hover:bg-[#e8e4df]")
                  }
                >
                  ₦{preset.toLocaleString()}
                </button>
              ))}
            </div>

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
                className="mt-2 border border-dashed border-[#ddd6cb] text-sm"
              >
                Dev top-up (test only)
              </Button>
            )}
          </Card>
        </div>

        {/* Right column (below, on mobile): transaction history — funding
            top-ups and order payments, newest first, from the wallet ledger. */}
        <Card>
          <p className="mb-1 font-display font-bold text-ink">Transaction history</p>
          <p className="mb-2 text-sm text-[#6b635a]">Every top-up, order payment, and refund.</p>

          {transactions === null && (
            <div className="divide-y divide-[#ebe7e0]">
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

          {groups.map((group) => (
            <div key={group.label}>
              <p className="pt-3 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#8a8178] first:pt-0">
                {group.label}
              </p>
              <div className="divide-y divide-[#ebe7e0]">
                {group.items.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export default Wallet;
