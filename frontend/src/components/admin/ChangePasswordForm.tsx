'use client';

import { useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Input from "@/components/Input";

// Mirrors backend/app/admin/schemas.py::_MIN_PASSWORD.
const MIN_PASSWORD = 8;

// Shared by the Settings card and the first-sign-in gate in the admin
// layout - same form, same rules, whether the change is optional or forced.
export default function ChangePasswordForm({ onChanged, submitLabel = "Change password" }: any) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: any) {
    e.preventDefault();
    setError(""); setDone(false);
    if (next.length < MIN_PASSWORD) return setError(`New password must be at least ${MIN_PASSWORD} characters.`);
    if (next !== confirm) return setError("The new passwords don't match.");
    setBusy(true);
    try {
      await api.changeAdminPassword(current, next);
      setCurrent(""); setNext(""); setConfirm("");
      setDone(true);
      onChanged?.();
    } catch (err: any) {
      setError(
        err.message.includes("incorrect") ? "Current password is incorrect."
        : err.message.includes("different") ? "Pick a password different from the current one."
        : "Could not change the password. (" + err.message + ")"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input type="password" placeholder="Current password" autoComplete="current-password"
        value={current} onChange={(e: any) => setCurrent(e.target.value)} required />
      <Input type="password" placeholder={`New password (${MIN_PASSWORD}+ characters)`} autoComplete="new-password"
        value={next} onChange={(e: any) => setNext(e.target.value)} required />
      <Input type="password" placeholder="Confirm new password" autoComplete="new-password"
        value={confirm} onChange={(e: any) => setConfirm(e.target.value)} required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-brand-green">Password changed.</p>}
      <Button type="submit" busy={busy}>{submitLabel}</Button>
    </form>
  );
}
