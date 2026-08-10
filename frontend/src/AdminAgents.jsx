import { useEffect, useState } from "react";
import { api } from "./api";
import Button from "./components/Button";
import Card from "./components/Card";
import EmptyState from "./components/EmptyState";
import { CardSkeleton } from "./components/Skeleton";

const POLL_MS = 20000;

function AdminAgents() {
  const [applications, setApplications] = useState(null);
  const [agents, setAgents] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [apps, agentList, marketList] = await Promise.all([
        api.getAgentApplications("pending"),
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
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Agents</h1>
      <p className="mb-6 text-slate-500">Approve applicants and see who's covering each market.</p>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <h2 className="mb-3 text-lg font-extrabold text-slate-900">Pending applications</h2>
      {applications === null ? (
        <div className="mb-8 space-y-2">{[0, 1].map((i) => <CardSkeleton key={i} />)}</div>
      ) : applications.length === 0 ? (
        <EmptyState icon="user" title="Nothing pending" subtitle="New agent applications will show up here." />
      ) : (
        <div className="mb-8 space-y-2">
          {applications.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">Applicant {a.user_id.slice(0, 8)}…</div>
                <div className="text-sm text-slate-500">{marketName(a.market_id)}</div>
                {a.note && <div className="mt-1 text-sm text-slate-500">"{a.note}"</div>}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="neutral"
                  onClick={() => handleDecide(a.id, "reject")}
                  busy={busyId === a.id}
                  className="text-sm"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleDecide(a.id, "approve")}
                  busy={busyId === a.id}
                  className="text-sm"
                >
                  Approve
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-lg font-extrabold text-slate-900">All agents</h2>
      {agents === null ? (
        <div className="space-y-2">{[0, 1].map((i) => <CardSkeleton key={i} />)}</div>
      ) : agents.length === 0 ? (
        <EmptyState icon="user" title="No agents yet" subtitle="Approved applicants will show up here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Agent</th>
                <th className="px-4 py-3 font-semibold">Market</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Completed</th>
                <th className="px-4 py-3 font-semibold">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-semibold text-slate-900">{a.full_name || a.phone}</td>
                  <td className="px-4 py-3 text-slate-700">{marketName(a.assigned_market_id)}</td>
                  <td className="px-4 py-3">
                    <span className={
                      "rounded-full px-2 py-0.5 text-xs font-bold " +
                      (a.on_duty && a.is_available
                        ? "bg-brand-green/10 text-brand-green"
                        : a.on_duty
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-500")
                    }>
                      {!a.on_duty ? "Off duty" : a.is_available ? "Available" : "Busy"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{a.completed_orders}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">₦{a.earnings_total}</td>
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
