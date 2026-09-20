'use client';

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Icon from "@/components/Icon";
import HeroBanner from "@/components/HeroBanner";
import AvatarUpload from "@/components/AvatarUpload";
import { ActiveOrderBanner } from "@/components/ActiveOrderBanner";
import SectionHeader from "@/components/SectionHeader";
import SwitchRow from "@/components/Switch";
import RoleSwitch from "@/components/RoleSwitch";
import { usePageSearch } from "@/components/PageSearchContext";
import settingsArt from "@/assets/illustrations/settings.png";

// One Settings screen shared by both personas (customer/agent) - the fields
// that differ (delivery address is customer-only) are gated on role, not
// forked into separate components, since everything else here is identical.
const STATUS_LABEL = { active: "Active", flagged: "Flagged", locked: "Locked" };
const STATUS_TONE = {
  active: "bg-brand-green/10 text-brand-green",
  flagged: "bg-brand-orange/15 text-brand-orange-dark",
  locked: "bg-red-100 text-red-700",
};

// Device-local preferences — Qyka has no per-user prefs endpoint yet, so
// these persist to localStorage (standard for notification / appearance
// settings, which are per-device anyway).
const PREFS_KEY = "qyka_prefs";
const DEFAULT_PREFS = {
  notif: { orders: true, messages: true, payments: true, promos: false },
  reduceMotion: false,
};
type Prefs = typeof DEFAULT_PREFS;

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    return {
      ...DEFAULT_PREFS,
      ...raw,
      notif: { ...DEFAULT_PREFS.notif, ...(raw.notif || {}) },
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function applyPrefs(p: Prefs) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("reduce-motion", p.reduceMotion);
}

const Toggle = SwitchRow;

// `extra` is an optional slot for a persona-specific card (e.g. Admin's own
// system-status card) rendered after Account, in the same column - keeps
// this one screen shared across all three personas instead of forking it,
// while still letting one of them add something the others don't need.
function Settings({ user, onUserUpdated, onLogout, extra, roleSwitch }: any) {
  const isCustomer = (user.role || "").toLowerCase() === "customer";
  const [fullName, setFullName] = useState(user.full_name || "");
  const [address, setAddress] = useState(user.default_delivery_address || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  // Top-bar search filters the sections themselves: type "motion" or "phone"
  // and only the cards that cover it stay.
  const q = usePageSearch("Search settings…");
  const KEYWORDS = {
    profile: "profile full name delivery address default",
    account: "account phone role",
    notifications: "notifications order updates agent messages payment reminders offers promos",
    appearance: "appearance reduce motion animation transitions",
    agent: "become an agent apply market shop earn",
    system: "system status api health",
    mode: "view mode switch agent customer role",
  };
  const matches = (key: keyof typeof KEYWORDS) => !q || KEYWORDS[key].includes(q);
  const hide = (key: keyof typeof KEYWORDS) => (matches(key) ? "" : "hidden");

  // Only customers can apply (an agent/admin already has - or is past -
  // this decision, and the backend itself refuses a non-customer's apply
  // call with 409 - see agent_applications.service.apply), so this whole
  // section only ever fetches/renders for them.
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => {
    const p = loadPrefs();
    setPrefs(p);
    applyPrefs(p);
  }, []);
  function updatePrefs(
    patch: Partial<Omit<Prefs, "notif">> & { notif?: Partial<Prefs["notif"]> }
  ) {
    setPrefs((cur) => {
      const next: Prefs = {
        ...cur,
        ...patch,
        notif: { ...cur.notif, ...(patch.notif || {}) },
      };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      applyPrefs(next);
      return next;
    });
  }

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

  const roleLabel = user.role ? user.role[0].toUpperCase() + user.role.slice(1).toLowerCase() : "Account";

  return (
    <div>
      {/* Same illustrated HeroBanner as the rest of the app. The account
          summary that used to sit in its own side card (avatar, name, phone,
          status, log out) is the hero now: who you are, at a glance, with
          the way out one tap away. */}
      <HeroBanner
        leading={<AvatarUpload user={user} onUserUpdated={onUserUpdated} />}
        eyebrow={roleLabel + " account"}
        title={user.full_name || "Your account"}
        body={
          <span className="inline-flex flex-wrap items-center gap-2">
            {user.phone}
            <span className={"rounded-full px-2.5 py-0.5 text-xs font-bold " + (STATUS_TONE[user.status] || "bg-sunken text-muted")}>
              {STATUS_LABEL[user.status] || user.status}
            </span>
          </span>
        }
        illustration={settingsArt}
        banner={<ActiveOrderBanner />}
        actions={
          <Button variant="neutral" onClick={onLogout}>
            Log out
          </Button>
        }
      />

      {q && !(Object.keys(KEYWORDS) as (keyof typeof KEYWORDS)[]).some((k) => matches(k)) && (
        <p className="mb-4 rounded-2xl bg-sunken-2/70 px-4 py-3 text-sm text-muted">
          No settings match &ldquo;{q}&rdquo;.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <Card className={hide("profile")}>
            <SectionHeader icon="user" title="Profile" className="mb-4" />
            <div className="grid grid-cols-1 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink/80">Full name</span>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ada Obi" />
              </label>

              {isCustomer && (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-ink/80">
                    Default delivery address <span className="font-normal text-faint">(optional)</span>
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

          <Card className={hide("account")}>
            <SectionHeader icon="phone" title="Account" className="mb-4" />
            <div className="grid grid-cols-1 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink/80">Phone</span>
                <Input value={user.phone} disabled className="bg-sunken-2 text-muted" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink/80">Role</span>
                <Input
                  value={user.role ? user.role[0].toUpperCase() + user.role.slice(1) : ""}
                  disabled
                  className="bg-sunken-2 text-muted"
                />
              </label>
            </div>
          </Card>

        </div>

        <div className="space-y-4">
          {roleSwitch && (
            <Card className={hide("mode")}>
              <SectionHeader icon="user" title="View mode" subtitle="Switch between agent and customer views of your account." className="mb-4" />
              <RoleSwitch {...roleSwitch} />
            </Card>
          )}

          <Card className={hide("notifications")}>
            <SectionHeader icon="chat" title="Notifications" subtitle="How Qyka reaches you on this device." className="mb-2" />
            <div className="divide-y divide-dashed divide-line-strong">
              <Toggle
                label="Order updates"
                hint="Agent assigned, shopping started, out for delivery"
                checked={prefs.notif.orders}
                onChange={(v) => updatePrefs({ notif: { orders: v } })}
              />
              <Toggle
                label="Agent messages"
                hint="Replies in the order chat"
                checked={prefs.notif.messages}
                onChange={(v) => updatePrefs({ notif: { messages: v } })}
              />
              <Toggle
                label="Payment reminders"
                hint="Deposits owed and balances due"
                checked={prefs.notif.payments}
                onChange={(v) => updatePrefs({ notif: { payments: v } })}
              />
              <Toggle
                label="Offers & updates"
                hint="New markets, occasional product news"
                checked={prefs.notif.promos}
                onChange={(v) => updatePrefs({ notif: { promos: v } })}
              />
            </div>
          </Card>

          <Card className={hide("appearance")}>
            <SectionHeader icon="settings" title="Appearance" subtitle="Motion on this device." className="mb-2" />

            <Toggle
              label="Reduce motion"
              hint="Minimise animations and transitions"
              checked={prefs.reduceMotion}
              onChange={(v) => updatePrefs({ reduceMotion: v })}
            />
          </Card>

          {/* Self-serve entry into the SAME admin-approved agent_applications
              workflow ProfileSetup offers on first login - this just makes
              it reachable later too, for a customer who skipped it then.
              Never shown for an agent/admin themselves (isCustomer gates
              it), and never lets them re-submit while one's still pending. */}
          {isCustomer && applications !== null && (
            <Card className={hide("agent")}>
              <SectionHeader icon="flag" title="Become an agent" className="mb-4" />

              {pendingApplication ? (
                <div className="flex items-center gap-3 rounded-2xl bg-brand-orange/[0.12] px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[#1A1A1A]">
                    <Icon name="clock" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">Application pending review</p>
                    <p className="text-sm text-muted">
                      We&apos;ll let you know once an admin has reviewed it.
                    </p>
                  </div>
                </div>
              ) : !showAgentForm ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-md text-sm text-muted">
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
                      Note <span className="font-normal text-faint">(optional)</span>
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

          {matches("system") && extra}
        </div>
      </div>
    </div>
  );
}

export default Settings;
