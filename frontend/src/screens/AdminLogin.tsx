'use client';

import { useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Input from "@/components/Input";

// Separate from the shared customer/agent Login screen on purpose: admins
// sign in with email+password, never phone/OTP (see backend/app/admin/routes.py).
function AdminLogin({ onLoggedIn }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: any) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api.adminLogin(email, password);
      localStorage.setItem("qyka_token", data.access_token);
      onLoggedIn(data.access_token);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Admin sign in</h1>
        <p className="mt-1 text-sm text-ink/60">Restricted to Qyka admin accounts.</p>
      </div>
      <Input
        type="email"
        placeholder="Email"
        autoComplete="username"
        value={email}
        onChange={(e: any) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e: any) => setPassword(e.target.value)}
        required
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" fullWidth busy={busy}>
        Sign in
      </Button>
    </form>
  );
}

export default AdminLogin;
