'use client';

import StatTile from "@/components/StatTile";
import { usePageSearch } from "@/components/PageSearchContext";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import UserDetailModal from "@/components/admin/UserDetailModal";

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
  const [view, setView] = useState<"all" | "flagged">("all");
  const [everyone, setEveryone] = useState<any>(null);
  const [users, setUsers] = useState<any>(null);
  const [confirmingId, setConfirmingId] = useState<any>(null);
  const [busyId, setBusyId] = useState<any>(null);
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const search = usePageSearch("Search users…");

  async function refresh() {
    try {
      const [all, flagged] = await Promise.all([api.getUsers(), api.getFlaggedUsers()]);
      setEveryone(all);
      setUsers(flagged.users);
      setError("");
    } catch (e) {
      setError("Could not load users. (" + e.message + ")");
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
      <AdminPageHeader icon="user" section="People" title="Users" description="Everyone who has signed up, and customers flagged for non-payment history.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Registered" value={everyone?.total ?? "—"} />
          <StatTile label="Customers" value={everyone ? everyone.by_role?.customer ?? 0 : "—"} />
          <StatTile label="Agents" value={everyone ? everyone.by_role?.agent ?? 0 : "—"} />
          <StatTile label="Flagged" value={users?.length ?? "—"} />
        </div>
      </AdminPageHeader>

      <div className="mb-4 inline-flex rounded-full border border-line bg-surface p-1 text-sm font-semibold">
        {([["all", "All users"], ["flagged", "Flagged"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={"rounded-full px-4 py-1.5 transition " + (view === key ? "bg-brand-orange text-[#1A1A1A]" : "text-muted hover:text-ink")}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {view === "all" ? (
        everyone === null ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
        ) : everyone.users.length === 0 ? (
          <EmptyState icon="user" title="No users yet" subtitle="People who sign up will show up here." />
        ) : (
          <div className="space-y-2">
            {everyone.users
              .filter((u) => !search || [u.full_name, u.email, u.phone].some((v) => String(v || "").toLowerCase().includes(search)))
              .map((u) => (
                <Card
                  key={u.id}
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-3 transition hover:border-brand-orange/40"
                  onClick={() => setDetailId(u.id)}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{u.full_name || u.email || u.phone}</div>
                    <div className="text-sm text-muted">{[u.email, u.phone].filter(Boolean).join(" · ")}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      Joined {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      {u.email && !u.is_email_verified ? " · email not verified" : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs font-bold">
                    <span className="rounded-full bg-sunken px-2.5 py-1 capitalize text-ink/80">{u.role}</span>
                    <span className={"rounded-full px-2.5 py-1 capitalize " + (u.status === "active" ? "bg-brand-green/10 text-brand-green" : u.status === "suspended" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700")}>{u.status}</span>
                  </div>
                </Card>
              ))}
          </div>
        )
      ) : (
        <>
      {users === null ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
      ) : users.length === 0 ? (
        <EmptyState icon="flag" title="No flagged users" subtitle="Customers with non-payment history will show up here." />
      ) : (
        <div className="space-y-2">
          {users.filter((u) => !search || [u.full_name, u.phone].some((v) => String(v || "").toLowerCase().includes(search))).map((u) => (
            <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 cursor-pointer" onClick={() => setDetailId(u.id)}>
                <div className="font-semibold text-ink hover:underline">{u.full_name || u.phone}</div>
                <div className="text-sm text-muted">{u.phone}</div>
                <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
                  {flagReasons(u).map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
              <div className="shrink-0">
                {confirmingId === u.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted">Clear this flag?</span>
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
        </>
      )}

      <UserDetailModal userId={detailId} onClose={() => setDetailId(null)} onChanged={refresh} />
    </div>
  );
}

export default AdminUsers;
