'use client';

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import Input from "@/components/Input";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import HeroBanner from "@/components/HeroBanner";
import { ActiveOrderBanner } from "@/components/ActiveOrderBanner";
import Chip from "@/components/Chip";
import SectionHeader from "@/components/SectionHeader";
import StatTile from "@/components/StatTile";
import { usePageSearch } from "@/components/PageSearchContext";
import walletArt from "@/assets/illustrations/wallet.png";
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
  ink: "bg-sunken text-ink/70",
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
        {time && <div className="text-xs text-faint">{time}</div>}
      </div>
      <div className="shrink-0 text-right">
        <div className={"font-bold tabular-nums " + (credit ? "text-brand-green" : "text-ink")}>
          {credit ? "+" : "−"}₦{Number(tx.amount).toLocaleString()}
        </div>
        <div className="text-xs text-faint">Bal. ₦{Number(tx.balance_after).toLocaleString()}</div>
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
  const [balance, setBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const search = usePageSearch("Search transactions…");

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

  const filteredTransactions = (transactions || []).filter((tx: any) => {
    if (!search) return true;
    const { label } = categorizeTransaction(tx);
    return [label, tx.note, tx.amount, Number(tx.amount).toLocaleString(), tx.direction === "credit" ? "credit in top-up refund" : "debit out payment"].some(
      (v) => String(v || "").toLowerCase().includes(search)
    );
  });
  const groups = transactions ? groupByDay(filteredTransactions) : [];

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
  const spentThisMonth = (transactions || [])
    .filter((tx: any) => {
      if (tx.direction !== "debit" || !tx.created_at) return false;
      const d = new Date(tx.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);
  const lastActivity = transactions?.[0]?.created_at
    ? new Date(transactions[0].created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "—";

  return (
    <div>
      {/* Same illustrated HeroBanner Shop/Track/History lead with. The
          balance IS the headline - it used to sit on a dark green gradient
          card, which broke the app's no-dark-surfaces rule and made this
          the one account page that looked like a different product. The
          figures beneath are real, already-fetched numbers (never invented
          stats), in the same soft tile style as Track's summary. */}
      <HeroBanner
        eyebrow="Available balance"
        title={
          <span className="tabular-nums">
            <span className="text-brand-orange-dark">₦</span>
            {balance != null ? Number(balance).toLocaleString() : "…"}
          </span>
        }
        body={
          verifying
            ? "Confirming your payment…"
            : "Fund it once, pay for orders in a tap. Refunds land back here too."
        }
        illustration={walletArt}
        banner={<ActiveOrderBanner />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            label="In this month"
            value={creditedThisMonth > 0 ? `+₦${creditedThisMonth.toLocaleString()}` : "—"}
            tone="green"
          />
          <StatTile
            label="Spent this month"
            value={spentThisMonth > 0 ? `₦${spentThisMonth.toLocaleString()}` : "—"}
          />
          <StatTile label="Last activity" value={lastActivity} />
        </div>
      </HeroBanner>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        <div className="space-y-4">
          <Card>
            <SectionHeader icon="plus" title="Fund wallet" className="mb-3" />

            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div className="mb-3 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((preset) => (
                <Chip key={preset} selected={amount === String(preset)} onClick={() => setAmount(String(preset))}>
                  ₦{preset.toLocaleString()}
                </Chip>
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
                className="mt-2 border border-dashed border-line-strong text-sm"
              >
                Dev top-up (test only)
              </Button>
            )}
          </Card>
        </div>

        {/* Right column (below, on mobile): transaction history — funding
            top-ups and order payments, newest first, from the wallet ledger. */}
        <Card>
          <SectionHeader icon="chart" title="Transaction history" subtitle="Every top-up, order payment, and refund." className="mb-2" />

          {transactions === null && (
            <div className="divide-y divide-dashed divide-line-strong">
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

          {transactions?.length > 0 && search && filteredTransactions.length === 0 && (
            <EmptyState icon="wallet" title="No matches" subtitle={`No transactions match “${search}”.`} />
          )}

          {transactions?.length === 0 && (
            <EmptyState icon="wallet" title="No transactions yet" subtitle="Fund your wallet to get started." />
          )}

          {groups.map((group) => (
            <div key={group.label}>
              <p className="pt-3 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-faint first:pt-0">
                {group.label}
              </p>
              <div className="divide-y divide-dashed divide-line-strong">
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
