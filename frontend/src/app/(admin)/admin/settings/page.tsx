"use client";
import Settings from "@/screens/Settings";
import { useAuth } from "@/components/AuthProvider";
export default function Page() {
  const { user, setUser, handleLogout } = useAuth();
  return <Settings user={user} onUserUpdated={setUser} onLogout={handleLogout} />;
}
