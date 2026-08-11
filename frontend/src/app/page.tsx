"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MarketingPage from "@/screens/MarketingPage";
import { useAuth } from "@/components/AuthProvider";

export default function HomePage() {
  const { token, user, loading, homePath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (token && user) router.replace(homePath);
  }, [loading, token, user, homePath, router]);

  // Logged-in users leave for their dashboard; everyone else (including the
  // brief auth-hydration moment) sees the marketing page so first paint stays fast.
  if (!loading && token && user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
        <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p>Loading…</p>
      </div>
    );
  }

  return <MarketingPage />;
}
