"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminLogin from "@/screens/AdminLogin";
import AuthShell from "@/components/AuthShell";
import { useAuth } from "@/components/AuthProvider";

function safeNext(raw: string | null) {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function AdminLoginPageInner() {
  const { token, user, loading, handleLoggedIn, homePath } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  // Only an admin session leaves this page. Anyone else (say, the customer
  // account you signed up with in this same browser) stays on the form -
  // redirecting them to their own home is what made this page bounce away.
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";
  useEffect(() => {
    if (!loading && token && user && isAdmin) {
      router.replace(next || homePath);
    }
  }, [loading, token, user, isAdmin, homePath, router, next]);

  return (
    <AuthShell size="sm">
      <AdminLogin onLoggedIn={(t: string) => handleLoggedIn(t)} />
    </AuthShell>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-canvas text-ink/50">
          Loading…
        </div>
      }
    >
      <AdminLoginPageInner />
    </Suspense>
  );
}
