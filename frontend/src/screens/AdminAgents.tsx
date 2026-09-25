'use client';

import StatTile from "@/components/StatTile";
import SectionHeader from "@/components/SectionHeader";
import { usePageSearch } from "@/components/PageSearchContext";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ApplicationCard from "@/components/admin/ApplicationCard";
import EmptyState from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";

const POLL_MS = 20000;

function AdminAgents() {
  const [applications, setApplications] = useState<any>(null);
  const [agents, setAgents] = useState<any>(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<any>(null);
  const [error, setError] = useState("");
  const search = usePageSearch("Search agents…");

  async function refresh() {
    try {
      const [apps, agentList, marketList] = await Promise.all([
        api.getAgentApplications("pending", "agent"),
        api.listAgents(),
        api.getAllMarkets(),
      ]);
      setApplications(apps);
      setAgents(agentList);
      setMarkets(marketList);
      setError("");
    } catch (e) {
      setError("Could not load agents. (" + e.message + ")");
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

  const marketName = (id) => markets.find((m) => m.id === id)?.name || (id ? id.slice(0, 8) + "…" : "—");

  return (
    <div>
      <AdminPageHeader icon="user" section="People" title="Agents" description="Approve applicants and see who&apos;s covering each market.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Pending applications" value={applications?.length ?? "—"} />
          <StatTile label="Agents" value={agents?.length ?? "—"} />
          <StatTile label="Available now" value={agents ? agents.filter((a) => a.on_duty && a.is_available).length : "—"} tone="green" />
          <StatTile label="Completed runs" value={agents ? agents.reduce((n, a) => n + (a.completed_orders || 0), 0) : "—"} />
        </div>
      </AdminPageHeader>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <SectionHeader icon="flag" title="Pending applications" subtitle="From the website and from customers in the app. Approving makes their phone number an agent account." className="mb-3" />
      {applications === null ? (
        <div className="mb-8 space-y-2">{[0, 1].map((i) => <CardSkeleton key={i} />)}</div>
      ) : applications.length === 0 ? (
        <div className="mb-8">
          <EmptyState icon="user" title="Nothing pending" subtitle="New agent applications will show up here." />
        </div>
      ) : (
        <div className="mb-8 space-y-2">
          {applications.map((a) => (
            <ApplicationCard key={a.id} app={a} place={marketName(a.market_id)} busy={busyId === a.id} onDecide={handleDecide} />
          ))}
        </div>
      )}

      <SectionHeader icon="user" title="All agents" subtitle="Duty status, completed runs and lifetime earnings." className="mb-3" />
      {agents === null ? (
        <div className="space-y-2">{[0, 1].map((i) => <CardSkeleton key={i} />)}</div>
      ) : agents.length === 0 ? (
        <EmptyState icon="user" title="No agents yet" subtitle="Approved applicants will show up here." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-faint">
                <th className="px-4 py-3 font-semibold">Agent</th>
                <th className="px-4 py-3 font-semibold">Market</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Completed</th>
                <th className="px-4 py-3 font-semibold">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {agents.filter((a) => !search || [a.full_name, a.phone, marketName(a.assigned_market_id)].some((v) => String(v || "").toLowerCase().includes(search))).map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{a.full_name || a.phone}</td>
                  <td className="px-4 py-3 text-ink/80">{marketName(a.assigned_market_id)}</td>
                  <td className="px-4 py-3">
                    <span className={
                      "rounded-full px-2 py-0.5 text-xs font-bold " +
                      (a.on_duty && a.is_available
                        ? "bg-brand-green/10 text-brand-green"
                        : a.on_duty
                          ? "bg-amber-50 text-amber-700"
                          : "bg-sunken text-muted")
                    }>
                      {!a.on_duty ? "Off duty" : a.is_available ? "Available" : "Busy"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink/80">{a.completed_orders}</td>
                  <td className="px-4 py-3 font-semibold text-ink">₦{a.earnings_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminAgents;
