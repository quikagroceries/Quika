"use client";

import Settings from "@/screens/Settings";
import { useAuth } from "@/components/AuthProvider";

export default function SettingsPage() {
  const { user, setUser, handleLogout, roleSwitch } = useAuth();
  return <Settings user={user} onUserUpdated={setUser} onLogout={handleLogout} roleSwitch={roleSwitch} />;
}
