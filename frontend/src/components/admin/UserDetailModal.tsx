'use client';

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { CardSkeleton } from "@/components/Skeleton";
import { api } from "@/lib/api";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Everything an admin needs for one support case, in one place: profile,
 * wallet balance + recent history, recent orders, and the actions that used
 * to require a database edit (suspend/reactivate, manual wallet adjustment).
 */
export default function UserDetailModal({ userId, onClose, onChanged }: { userId: string | null; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adjusting, setAdjusting] = useState<"credit" | "debit" | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  async function load() {
    if (!userId) return;
    setError("");
    try {
      setDetail(await api.getUserDetail(userId));
    } catch (e) {
      setError("Could not load this user. (" + e.message + ")");
    }
  }

  useEffect(() => {
    setDetail(null);
    setAdjusting(null);
    setAmount("");
    setNote("");
    setConfirmSuspend(false);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleSuspendToggle() {
    setBusy(true);
    setError("");
    try {
      if (detail.status === "suspended") await api.reactivateUser(userId);
      else await api.suspendUser(userId);
      setConfirmSuspend(false);
      await load();
      onChanged();
    } catch (e) {
      setError("Could not update this account: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAdjust() {
    if (!adjusting || !amount || !note.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.adjustWallet(userId, { direction: adjusting, amount, note: note.trim() });
      setAdjusting(null);
      setAmount("");
      setNote("");
      await load();
      onChanged();
    } catch (e) {
      setError("Could not adjust the wallet: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!userId} onClose={onClose} title="User detail" className="max-w-lg">
      {!detail ? (
        <CardSkeleton />
      ) : (
        <div className="max-h-[75vh] space-y-5 overflow-y-auto">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-ink">{detail.full_name || detail.email || detail.phone}</p>
              <span className={"rounded-full px-2 py-0.5 text-xs font-bold capitalize " + (detail.status === "active" ? "bg-brand-green/10 text-brand-green" : detail.status === "suspended" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700")}>
                {detail.status}
              </span>
              <span className="rounded-full bg-sunken px-2 py-0.5 text-xs font-bold capitalize text-ink/80">{detail.role}</span>
            </div>
            <p className="text-sm text-muted">{[detail.email, detail.phone].filter(Boolean).join(" · ")}</p>
            <p className="mt-0.5 text-xs text-muted">Joined {fmtDate(detail.created_at)}</p>
            {detail.non_payment_count > 0 && (
              <p className="mt-1 text-xs font-semibold text-amber-700">{detail.non_payment_count} non-payment(s) on record{detail.must_prepay ? " · must prepay" : ""}</p>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-canvas p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted">Wallet balance</p>
              <p className="text-xl font-bold text-ink">₦{detail.wallet_balance}</p>
            </div>
            {adjusting ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-semibold text-ink">{adjusting === "credit" ? "Credit" : "Debit"} this wallet</p>
                <input
                  type="number" min="0.01" step="0.01" placeholder="Amount (₦)" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                />
                <input
                  type="text" placeholder={'Reason (required, e.g. "late delivery goodwill credit")'} value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <Button variant="neutral" className="text-sm" onClick={() => setAdjusting(null)} disabled={busy}>Cancel</Button>
                  <Button className="text-sm" onClick={handleAdjust} busy={busy} disabled={!amount || !note.trim()}>Confirm</Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button variant="neutral" className="text-sm" onClick={() => setAdjusting("credit")}>Credit</Button>
                <Button variant="neutral" className="text-sm" onClick={() => setAdjusting("debit")}>Debit</Button>
              </div>
            )}
          </div>

          {detail.wallet_ledger.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-muted">Recent wallet activity</p>
              <div className="space-y-1.5">
                {detail.wallet_ledger.slice(0, 8).map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <span className="min-w-0 truncate text-ink/80">{l.note || "—"}</span>
                    <span className={"shrink-0 pl-3 font-semibold " + (l.direction === "credit" ? "text-brand-green" : "text-red-600")}>
                      {l.direction === "credit" ? "+" : "−"}₦{l.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail.orders.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-muted">Recent orders</p>
              <div className="space-y-1.5">
                {detail.orders.slice(0, 8).map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink/80">
                      {fmtDate(o.created_at)} <span className="text-muted">({o.as_agent ? "as agent" : "as customer"})</span>
                    </span>
                    <span className="shrink-0 pl-3 font-semibold capitalize text-ink">{o.status.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail.role !== "admin" && (
            <div className="border-t border-line pt-4">
              {confirmSuspend ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">
                    {detail.status === "suspended" ? "Reactivate this account?" : "Suspend this account? They'll be signed out immediately."}
                  </span>
                  <Button variant="neutral" className="text-sm" onClick={() => setConfirmSuspend(false)} disabled={busy}>Cancel</Button>
                  <Button className="text-sm" onClick={handleSuspendToggle} busy={busy}>Confirm</Button>
                </div>
              ) : (
                <Button
                  variant={detail.status === "suspended" ? "primary" : "neutral"}
                  className={"text-sm " + (detail.status !== "suspended" ? "!text-red-600" : "")}
                  onClick={() => setConfirmSuspend(true)}
                >
                  {detail.status === "suspended" ? "Reactivate account" : "Suspend account"}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
