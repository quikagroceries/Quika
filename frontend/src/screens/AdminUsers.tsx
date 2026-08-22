'use client';

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";

// Mirrors admin.routes.flagged_users' own criteria exactly, so the reason
// shown here is never a guess about why someone's in this list.
function flagReasons(u) {
  const reasons = [];
  if (u.must_prepay) reasons.push("must pay 100% upfront (a prior order wasn't paid)");
  if (u.non_payment_count > 0) reasons.push(`${u.non_payment_count} non-payment${u.non_payment_count === 1 ? "" : "s"} on record`);
  if (u.status === "flagged") reasons.push("account flagged");
  if (u.status === "locked") reasons.push("account locked");
  return reasons;
}

function AdminUsers() {
  const [users, setUsers] = useState<any>(null);
  const [confirmingId, setConfirmingId] = useState<any>(null);
  const [busyId, setBusyId] = useState<any>(null);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const data = await api.getFlaggedUsers();
      setUsers(data.users);
      setError("");
    } catch (e) {
      setError("Could not load flagged users. (" + e.message + ")");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleClear(userId) {
    setError(""); setBusyId(userId);
    try {
      await api.clearUserFlag(userId);
      setConfirmingId(null);
      await refresh();
    } catch (e) {
      setError("Could not clear the flag: " + e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Users</h1>
      <p className="mb-6 text-[#6b635a]">Customers flagged for non-payment history — why, and the option to pardon.</p>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {users === null ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
      ) : users.length === 0 ? (
        <EmptyState icon="flag" title="No flagged users" subtitle="Customers with non-payment history will show up here." />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-ink">{u.full_name || u.phone}</div>
                <div className="text-sm text-[#6b635a]">{u.phone}</div>
                <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
                  {flagReasons(u).map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
              <div className="shrink-0">
                {confirmingId === u.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#6b635a]">Clear this flag?</span>
                    <Button variant="neutral" onClick={() => setConfirmingId(null)} disabled={busyId === u.id} className="text-sm">
                      Cancel
                    </Button>
                    <Button onClick={() => handleClear(u.id)} busy={busyId === u.id} className="text-sm">
                      Confirm
                    </Button>
                  </div>
                ) : (
                  <Button variant="neutral" onClick={() => setConfirmingId(u.id)} className="text-sm">
                    Clear flag
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
