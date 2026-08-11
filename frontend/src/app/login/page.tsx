"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Login from "@/screens/Login";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/components/AuthProvider";
import { loadGuestDraft } from "@/lib/guestDraft";

function safeNext(raw: string | null) {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function LoginPageInner() {
  const { token, user, loading, handleLoggedIn, homePath } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next")) || (loadGuestDraft() ? "/shop" : null);

  useEffect(() => {
    if (!loading && token && user) {
      router.replace(next || homePath);
    }
  }, [loading, token, user, homePath, router, next]);

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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
          Loading…
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
