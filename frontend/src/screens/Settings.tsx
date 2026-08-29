'use client';

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Icon from "@/components/Icon";
import { ActiveOrderBanner } from "@/components/ActiveOrderBanner";

// One Settings screen shared by both personas (customer/agent) - the fields
// that differ (delivery address is customer-only) are gated on role, not
// forked into separate components, since everything else here is identical.
const STATUS_LABEL = { active: "Active", flagged: "Flagged", locked: "Locked" };
const STATUS_TONE = {
  active: "bg-brand-green/10 text-brand-green",
  flagged: "bg-amber-100 text-amber-700",
  locked: "bg-red-100 text-red-700",
};

// `extra` is an optional slot for a persona-specific card (e.g. Admin's own
// system-status card) rendered after Account, in the same column - keeps
// this one screen shared across all three personas instead of forking it,
// while still letting one of them add something the others don't need.
function Settings({ user, onUserUpdated, onLogout, extra }: any) {
  const isCustomer = (user.role || "").toLowerCase() === "customer";
  const [fullName, setFullName] = useState(user.full_name || "");
  const [address, setAddress] = useState(user.default_delivery_address || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Only customers can apply (an agent/admin already has - or is past -
  // this decision, and the backend itself refuses a non-customer's apply
  // call with 409 - see agent_applications.service.apply), so this whole
  // section only ever fetches/renders for them.
  const [applications, setApplications] = useState<any>(null); // null = loading
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [agentMarkets, setAgentMarkets] = useState<any[]>([]);
  const [agentMarketId, setAgentMarketId] = useState("");
  const [agentNote, setAgentNote] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentError, setAgentError] = useState("");

  useEffect(() => {
    if (!isCustomer) return;
    api.getMyAgentApplications().then(setApplications).catch(() => setApplications([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- role never changes under this component
  }, []);

  function openAgentForm() {
    setShowAgentForm(true);
    if (agentMarkets.length === 0) {
      api.getMarkets().then(setAgentMarkets).catch(() => {});
    }
  }

  async function handleApplyAsAgent() {
    setAgentError(""); setAgentBusy(true);
    try {
      const application = await api.applyAsAgent({
        market_id: agentMarketId,
        note: agentNote.trim() || null,
      });
      setApplications((cur) => [application, ...(cur || [])]);
      setShowAgentForm(false);
      setAgentNote("");
      setAgentMarketId("");
    } catch (e) {
      setAgentError("Could not submit: " + e.message);
    } finally {
      setAgentBusy(false);
    }
  }

  const pendingApplication = (applications || []).find((a) => a.status === "pending");

  const dirty =
    fullName.trim() !== (user.full_name || "") ||
    (isCustomer && address.trim() !== (user.default_delivery_address || ""));

  async function handleSave() {
    setError(""); setBusy(true); setSaved(false);
    try {
      const updated = await api.updateProfile({
        full_name: fullName.trim(),
        ...(isCustomer ? { default_delivery_address: address.trim() || null } : {}),
      });
      onUserUpdated(updated);
      setSaved(true);
    } catch (e) {
      setError("Could not save: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Settings</h1>
          <p className="mt-1 text-[#6b635a]">Your account details.</p>
        </div>
        <ActiveOrderBanner />
      </div>

      {/* Standard settings layout: an account summary card that stays put
          (left, sticky on desktop) alongside the editable sections (right,
          wide enough for fields to sit two-up) - the same wide-page shape
          Wallet uses, instead of one narrow column stranded on a full-width
          page. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <Card className="lg:sticky lg:top-6">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
              <Icon name="user" className="h-7 w-7" />
            </span>
            <div className="mt-3 truncate font-display text-lg font-extrabold tracking-tight text-ink">
              {user.full_name || "Unnamed"}
            </div>
            <div className="truncate text-sm text-[#6b635a]">{user.phone}</div>
            <span
              className={
                "mt-2 shrink-0 rounded-full px-3 py-1 text-xs font-bold " +
                (STATUS_TONE[user.status] || "bg-[#f0eeeb] text-[#6b635a]")
              }
            >
              {STATUS_LABEL[user.status] || user.status}
            </span>
          </div>
          <Button variant="neutral" onClick={onLogout} fullWidth className="mt-5">
            Log out
          </Button>
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[#8a8178]">Profile</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink/80">Full name</span>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ada Obi" />
              </label>

              {isCustomer && (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-ink/80">
                    Default delivery address <span className="font-normal text-[#8a8178]">(optional)</span>
                  </span>
                  <Input
                    placeholder="e.g. 12 Allen Avenue, Ikeja"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </label>
              )}
            </div>

            <Button
              onClick={handleSave}
              busy={busy}
              disabled={!fullName.trim() || !dirty}
              className="mt-4"
            >
              Save changes
            </Button>
            {saved && !dirty && <p className="mt-2 text-sm font-semibold text-brand-green">Saved.</p>}
            {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          </Card>

          <Card>
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[#8a8178]">Account</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink/80">Phone</span>
                <Input value={user.phone} disabled className="bg-[#f7f5f2] text-[#6b635a]" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink/80">Role</span>
                <Input
                  value={user.role ? user.role[0].toUpperCase() + user.role.slice(1) : ""}
                  disabled
                  className="bg-[#f7f5f2] text-[#6b635a]"
                />
              </label>
            </div>
          </Card>

          {/* Self-serve entry into the SAME admin-approved agent_applications
              workflow ProfileSetup offers on first login - this just makes
              it reachable later too, for a customer who skipped it then.
              Never shown for an agent/admin themselves (isCustomer gates
              it), and never lets them re-submit while one's still pending. */}
          {isCustomer && applications !== null && (
            <Card>
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[#8a8178]">
                Become an agent
              </p>

              {pendingApplication ? (
                <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Icon name="clock" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-amber-800">Application pending review</p>
                    <p className="text-sm text-amber-700">
                      We&apos;ll let you know once an admin has reviewed it.
                    </p>
                  </div>
                </div>
              ) : !showAgentForm ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-md text-sm text-[#6b635a]">
                    Shop on behalf of customers at a market and earn a fee.
                  </p>
                  <Button variant="neutral" onClick={openAgentForm}>
                    Apply now
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-ink/80">Market</span>
                    <Input as="select" value={agentMarketId} onChange={(e) => setAgentMarketId(e.target.value)}>
                      <option value="">Select a market…</option>
                      {agentMarkets.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} — {m.city}</option>
                      ))}
                    </Input>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-ink/80">
                      Note <span className="font-normal text-[#8a8178]">(optional)</span>
                    </span>
                    <Input
                      placeholder="e.g. I already run a stall at this market"
                      value={agentNote}
                      onChange={(e) => setAgentNote(e.target.value)}
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApplyAsAgent}
                      busy={agentBusy}
                      disabled={!agentMarketId}
                      className="flex-1"
                    >
                      Submit application
                    </Button>
                    <Button
                      variant="neutral"
                      onClick={() => setShowAgentForm(false)}
                      disabled={agentBusy}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                  {agentError && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{agentError}</p>
                  )}
                </div>
              )}
            </Card>
          )}

          {extra}
        </div>
      </div>
    </div>
  );
}

export default Settings;
