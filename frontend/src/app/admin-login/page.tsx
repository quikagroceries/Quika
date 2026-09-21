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

  useEffect(() => {
    if (!loading && token && user) {
      router.replace(next || homePath);
    }
  }, [loading, token, user, homePath, router, next]);

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
