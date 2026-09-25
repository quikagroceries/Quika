"use client";

import { useState } from "react";
import Settings from "@/screens/Settings";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import SectionHeader from "@/components/SectionHeader";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

// Agents approved straight from the public For Agents page have no
// customer side until they ask for one here - then they get the shopping
// app and the agent/customer switch, same as an agent who was a customer
// first. Never shown to an agent who already has it.
function RegisterCustomerCard({ user, onRegistered }) {
  const [address, setAddress] = useState(user.default_delivery_address || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      onRegistered(await api.registerAsCustomer({ default_delivery_address: address.trim() || undefined }));
    } catch (err: any) {
      setError("Could not register: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionHeader
        icon="basket"
        title="Shop as a customer"
        subtitle={`Register ${user.phone || "this number"} as a customer too, to order groceries for yourself and switch between agent and customer.`}
        className="mb-4"
      />
      <form onSubmit={handleRegister} className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink/80">Delivery address (optional)</span>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Allen Avenue, Ikeja" />
        </label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div>
          <Button type="submit" busy={busy}>Register as a customer</Button>
        </div>
      </form>
    </Card>
  );
}

export default function AgentSettingsPage() {
  const { user, setUser, handleLogout, roleSwitch } = useAuth();
  return (
    <Settings
      user={user}
      onUserUpdated={setUser}
      onLogout={handleLogout}
      roleSwitch={roleSwitch}
      extra={user?.has_customer_side === false ? <RegisterCustomerCard user={user} onRegistered={setUser} /> : null}
    />
  );
}
