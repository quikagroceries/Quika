"use client";

import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import ProfileSetup from "@/screens/ProfileSetup";
import { useAuth } from "@/components/AuthProvider";

export default function SetupPage() {
  const { user, setUser, onDuty } = useAuth();
  const router = useRouter();

  return (
    <RequireAuth roles={["CUSTOMER", "AGENT"]}>
      <ProfileSetup
        user={user}
        onDone={(u) => {
          setUser(u);
          const role = (u.role || "").toUpperCase();
          if (role === "ADMIN") router.replace("/admin");
          else if (role === "AGENT") router.replace(onDuty ? "/agent" : "/shop");
          else router.replace("/shop");
        }}
      />
    </RequireAuth>
  );
}
