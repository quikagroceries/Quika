'use client';

import { useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Icon from "@/components/Icon";

// Shown exactly once, right after first login, to anyone with no name saved
// yet (App.jsx decides). Two different shapes depending on who's arriving:
//
//   - A brand-new signup is always role=CUSTOMER (that's the only role OTP
//     verify ever self-assigns - see auth.routes.verify_otp). They haven't
//     told us what they're here for yet, so this asks first. Agents are
//     never self-granted the role though - becoming one goes through the
//     existing admin-approved agent_applications workflow (see
//     app/agent_applications). Choosing "agent" here just fast-tracks into
//     that application with the name/market already collected; the account
//     stays a customer until an admin approves it.
//
//   - An account whose role is ALREADY fixed (an agent provisioned by an
//     admin, e.g. via dev-seed, who has just never logged in before) has no
//     role to choose - asking again would be nonsensical - so it's just a
//     plain name prompt.
function ProfileSetup({ user, onDone }: any) {
  const roleFixed = (user.role || "").toUpperCase() !== "CUSTOMER";

  const [step, setStep] = useState(roleFixed ? "details" : "role"); // role | details | agent-submitted
  const [role, setRole] = useState(roleFixed ? "fixed" : null);     // "customer" | "agent" | "fixed"
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketId, setMarketId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedUser, setSavedUser] = useState<any>(null);

  async function chooseRole(r) {
    setRole(r);
    setStep("details");
    if (r === "agent" && markets.length === 0) {
      try {
        setMarkets(await api.getMarkets());
      } catch {
        // The market dropdown will just show empty; the submit button stays
        // disabled without a market, so this fails safe.
      }
    }
  }

  async function handleNameContinue() {
    setError(""); setBusy(true);
    try {
      const updated = await api.updateProfile({
        full_name: fullName.trim(),
        ...(role === "customer" ? { default_delivery_address: address.trim() || null } : {}),
      });
      onDone(updated);
    } catch (e) {
      setError("Could not save: " + e.message);
      setBusy(false);
    }
  }

  async function handleAgentSubmit() {
    setError(""); setBusy(true);
    try {
      const updated = await api.updateProfile({ full_name: fullName.trim() });
      await api.applyAsAgent({ market_id: marketId, note: note.trim() || null });
      setSavedUser(updated);
      setStep("agent-submitted");
    } catch (e) {
      setError("Could not submit: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  if (step === "role") {
    return (
      <div className="mx-auto max-w-sm py-8">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900">Welcome to Quika</h1>
        <p className="mb-8 text-slate-500">What would you like to do?</p>

        <div className="space-y-3">
          <button
            onClick={() => chooseRole("customer")}
            className="w-full rounded-2xl border-2 border-slate-200 bg-white p-5 text-left shadow-card transition-colors hover:border-brand-orange hover:bg-brand-orange/5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
                <Icon name="basket" className="h-6 w-6" />
              </span>
              <div>
                <div className="text-lg font-bold text-slate-900">Shop with Quika</div>
                <div className="text-sm text-slate-500">Place orders and have a market agent shop for you.</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => chooseRole("agent")}
            className="w-full rounded-2xl border-2 border-slate-200 bg-white p-5 text-left shadow-card transition-colors hover:border-brand-orange hover:bg-brand-orange/5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                <Icon name="store" className="h-6 w-6" />
              </span>
              <div>
                <div className="text-lg font-bold text-slate-900">Become an agent</div>
                <div className="text-sm text-slate-500">Shop on behalf of customers at a market and earn a fee.</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (step === "agent-submitted") {
    return (
      <div className="mx-auto max-w-sm py-8">
        <Card>
          <p className="mb-2 text-lg font-bold text-slate-900">Application submitted</p>
          <p className="text-slate-600">
            We've received your application to become an agent and will let you know once it's reviewed.
            For now, carry on using Quika as a customer.
          </p>
          <Button onClick={() => onDone(savedUser)} fullWidth className="mt-4">
            Continue
          </Button>
        </Card>
      </div>
    );
  }

  // step === "details"
  return (
    <div className="mx-auto max-w-sm py-8">
      {!roleFixed && (
        <button
          onClick={() => setStep("role")}
          className="mb-4 text-sm font-semibold text-brand-orange hover:underline"
        >
          ← Back
        </button>
      )}
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900">
        {role === "agent" ? "Apply as an agent" : "Complete your profile"}
      </h1>
      <p className="mb-8 text-slate-500">
        {role === "agent"
          ? "Tell us a bit about you and which market you'd shop at."
          : "Just a couple of details before we get you shopping."}
      </p>

      <Card>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Full name</span>
            <Input
              placeholder="e.g. Ada Obi"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>

          {role === "customer" && (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Delivery address <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <Input
                placeholder="e.g. 12 Allen Avenue, Ikeja"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
          )}

          {role === "agent" && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Market</span>
                <Input as="select" value={marketId} onChange={(e) => setMarketId(e.target.value)}>
                  <option value="">Select a market…</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} — {m.city}</option>
                  ))}
                </Input>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Note <span className="font-normal text-slate-400">(optional)</span>
                </span>
                <Input
                  placeholder="e.g. I already run a stall at this market"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </>
          )}

          <Button
            onClick={role === "agent" ? handleAgentSubmit : handleNameContinue}
            busy={busy}
            disabled={!fullName.trim() || (role === "agent" && !marketId)}
            fullWidth
            className="mt-2"
          >
            {role === "agent" ? "Submit application" : "Continue"}
          </Button>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ProfileSetup;
