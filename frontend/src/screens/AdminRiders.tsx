'use client';

import StatTile from "@/components/StatTile";
import SectionHeader from "@/components/SectionHeader";
import { usePageSearch } from "@/components/PageSearchContext";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ApplicationCard from "@/components/admin/ApplicationCard";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";

const POLL_MS = 20000;

function StatusPill({ status }) {
  return (
    <span className={
      "rounded-full px-2 py-0.5 text-xs font-bold " +
      (status === "active" ? "bg-brand-green/10 text-brand-green" : "bg-amber-50 text-amber-700")
    }>
      {status === "active" ? "Active" : "Suspended"}
    </span>
  );
}

function joined(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
}

function AdminRiders() {
  const [applications, setApplications] = useState<any>(null);
  const [riders, setRiders] = useState<any>(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<any>(null);
  const [error, setError] = useState("");
  const search = usePageSearch("Search riders…");

  async function refresh() {
    try {
      const [apps, riderList, marketList] = await Promise.all([
        api.getAgentApplications("pending", "rider"),
        api.listRiders(),
        api.getAllMarkets(),
      ]);
      setApplications(apps);
      setRiders(riderList);
      setMarkets(marketList);
      setError("");
    } catch (e) {
      setError("Could not load riders. (" + e.message + ")");
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, []);

  async function handleDecide(applicationId, decision) {
    setError(""); setBusyId(applicationId);
    try {
      if (decision === "approve") await api.approveAgentApplication(applicationId);
      else await api.rejectAgentApplication(applicationId);
      await refresh();
    } catch (e) {
      setError("Could not " + decision + ": " + e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(rider) {
    setError(""); setBusyId(rider.id);
    try {
      await api.setRiderStatus(rider.id, rider.status === "active" ? "suspended" : "active");
      await refresh();
    } catch (e) {
      setError("Could not update this rider: " + e.message);
    } finally {
      setBusyId(null);
    }
  }

  const marketName = (id) => (id ? markets.find((m) => m.id === id)?.name : null);
  const coverage = (r) => [r.area, marketName(r.market_id)].filter(Boolean).join(" · ") || "—";
  const visible = (riders || []).filter((r) =>
    !search || [r.full_name, r.phone, r.area, r.vehicle, marketName(r.market_id)].some((v) => String(v || "").toLowerCase().includes(search))
  );

  const statusButton = (r) => (
    <Button variant="neutral" onClick={() => toggleStatus(r)} busy={busyId === r.id} className="text-sm">
      {r.status === "active" ? "Suspend" : "Reactivate"}
    </Button>
  );

  return (
    <div>
      <AdminPageHeader icon="bike" section="People" title="Riders" description="Approve rider applicants and keep track of who&apos;s on the roster.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Pending applications" value={applications?.length ?? "—"} />
          <StatTile label="Riders" value={riders?.length ?? "—"} />
          <StatTile label="Active" value={riders ? riders.filter((r) => r.status === "active").length : "—"} tone="green" />
          <StatTile label="Suspended" value={riders ? riders.filter((r) => r.status === "suspended").length : "—"} />
        </div>
      </AdminPageHeader>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <SectionHeader icon="flag" title="Pending applications" subtitle="From the website's For Riders page. Call to vet them, then approve or reject." className="mb-3" />
      {applications === null ? (
        <div className="mb-8 space-y-2">{[0, 1].map((i) => <CardSkeleton key={i} />)}</div>
      ) : applications.length === 0 ? (
        <div className="mb-8">
          <EmptyState icon="bike" title="Nothing pending" subtitle="New rider applications will show up here." />
        </div>
      ) : (
        <div className="mb-8 space-y-2">
          {applications.map((a) => (
            <ApplicationCard
              key={a.id}
              app={a}
              place={[a.area, marketName(a.market_id)].filter(Boolean).join(" · ")}
              busy={busyId === a.id}
              onDecide={handleDecide}
            />
          ))}
        </div>
      )}

      <SectionHeader icon="bike" title="All riders" subtitle="Coverage, vehicle and status. Suspend anyone who shouldn't get work." className="mb-3" />
      {riders === null ? (
        <div className="space-y-2">{[0, 1].map((i) => <CardSkeleton key={i} />)}</div>
      ) : riders.length === 0 ? (
        <EmptyState icon="bike" title="No riders yet" subtitle="Approved applicants will show up here." />
      ) : visible.length === 0 ? (
        <EmptyState icon="search" title="No matches" subtitle="No rider matches that search." />
      ) : (
        <>
          {/* Phones: one card per rider - no sideways-scrolling table. */}
          <div className="space-y-2 md:hidden">
            {visible.map((r) => (
              <Card key={r.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{r.full_name}</div>
                    <a href={`tel:${r.phone}`} className="text-sm font-semibold text-brand-orange-dark hover:underline">{r.phone}</a>
                  </div>
                  <StatusPill status={r.status} />
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div className="col-span-2"><dt className="text-xs text-faint">Covers</dt><dd className="text-ink/80">{coverage(r)}</dd></div>
                  <div><dt className="text-xs text-faint">Vehicle</dt><dd className="text-ink/80">{r.vehicle || "—"}</dd></div>
                  <div><dt className="text-xs text-faint">Joined</dt><dd className="text-ink/80">{joined(r.created_at)}</dd></div>
                </dl>
                {statusButton(r)}
              </Card>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-line bg-surface shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-faint">
                  <th className="px-4 py-3 font-semibold">Rider</th>
                  <th className="px-4 py-3 font-semibold">Covers</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{r.full_name}</div>
                      <a href={`tel:${r.phone}`} className="text-xs font-semibold text-brand-orange-dark hover:underline">{r.phone}</a>
                    </td>
                    <td className="px-4 py-3 text-ink/80">{coverage(r)}</td>
                    <td className="px-4 py-3 text-ink/80">{r.vehicle || "—"}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink/80">{joined(r.created_at)}</td>
                    <td className="px-4 py-3 text-right">{statusButton(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminRiders;
