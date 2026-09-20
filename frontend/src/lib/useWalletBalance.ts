"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

let cachedBalance: number | null = null;
const listeners = new Set<(bal: number | null) => void>();

export function mutateWalletBalance(newBal: number | null) {
  cachedBalance = newBal;
  listeners.forEach((l) => l(newBal));
}

export function useWalletBalance() {
  const { token, user } = useAuth();
  const [balance, setBalance] = useState<number | null>(cachedBalance);
  const [loading, setLoading] = useState<boolean>(cachedBalance === null);

  useEffect(() => {
    function handleChange(b: number | null) {
      setBalance(b);
    }
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  useEffect(() => {
    if (!token || !user) {
      mutateWalletBalance(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    api
      .getWalletBalance()
      .then((data: any) => {
        if (isMounted && data && typeof data.balance === "number") {
          mutateWalletBalance(data.balance);
        }
      })
      .catch(() => {
        // graceful fallback
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, user]);

  return {
    balance,
    loading,
    refetch: () =>
      api
        .getWalletBalance()
        .then((d: any) => mutateWalletBalance(d?.balance ?? 0))
        .catch(() => {}),
  };
}
