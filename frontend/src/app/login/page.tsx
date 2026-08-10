"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Login from "@/screens/Login";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { token, user, loading, handleLoggedIn, homePath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && token && user) router.replace(homePath);
  }, [loading, token, user, homePath, router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      <main className="mx-auto max-w-lg px-4 py-6">
        <Login
          onLoggedIn={(t) => {
            handleLoggedIn(t);
          }}
        />
      </main>
    </div>
  );
}
