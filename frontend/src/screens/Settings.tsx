'use client';

import { useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Icon from "@/components/Icon";

// One Settings screen shared by both personas (customer/agent) - the fields
// that differ (delivery address is customer-only) are gated on role, not
// forked into separate components, since everything else here is identical.
const STATUS_LABEL = { active: "Active", flagged: "Flagged", locked: "Locked" };
const STATUS_TONE = {
  active: "bg-brand-green/10 text-brand-green",
  flagged: "bg-amber-100 text-amber-700",
  locked: "bg-red-100 text-red-700",
};

function Settings({ user, onUserUpdated, onLogout }: any) {
  const isCustomer = (user.role || "").toLowerCase() === "customer";
  const [fullName, setFullName] = useState(user.full_name || "");
  const [address, setAddress] = useState(user.default_delivery_address || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

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
      <h1 className="mb-1 font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Settings</h1>
      <p className="mb-6 text-[#6b635a]">Your account details.</p>

      <div className="max-w-[560px] space-y-4">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
              <Icon name="user" className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-lg font-extrabold tracking-tight text-ink">{user.full_name || "Unnamed"}</div>
              <div className="truncate text-sm text-[#6b635a]">{user.phone}</div>
            </div>
            <span
              className={
                "shrink-0 rounded-full px-3 py-1 text-xs font-bold " +
                (STATUS_TONE[user.status] || "bg-[#f0eeeb] text-[#6b635a]")
              }
            >
              {STATUS_LABEL[user.status] || user.status}
            </span>
          </div>

          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[#8a8178]">Profile</p>
          <div className="space-y-3">
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

          <Button onClick={handleSave} busy={busy} disabled={!fullName.trim() || !dirty} fullWidth className="mt-4">
            Save changes
          </Button>
          {saved && !dirty && <p className="mt-2 text-sm font-semibold text-brand-green">Saved.</p>}
          {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </Card>

        <Card>
          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[#8a8178]">Account</p>
          <div className="space-y-3">
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

        <Button variant="neutral" onClick={onLogout} fullWidth>
          Log out
        </Button>
      </div>
    </div>
  );
}

export default Settings;
