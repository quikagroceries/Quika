"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

/**
 * Small client island for root home route.
 * Redirects logged-in users to their respective home dashboard without blocking SSR for guests.
 */
export default function AuthRedirect() {
  const { token, user, loading, homePath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (token && user) router.replace(homePath);
  }, [loading, token, user, homePath, router]);

  return null;
}
