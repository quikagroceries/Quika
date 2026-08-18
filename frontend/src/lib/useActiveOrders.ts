"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { isHistoryStatus } from "@/lib/orderStatus";

const POLL_MS = 10000;

/**
 * The customer's in-progress orders (anything not delivered/closed/
 * cancelled), each annotated with `marketName` for display. Shared by the
 * active-order banner and the dedicated Track page so there's exactly one
 * place that decides what "active" means and how often to check.
 *
 * Returns null while unauthenticated or not yet loaded, [] once loaded with
 * nothing active — callers can tell "still figuring it out" from "genuinely
 * none right now."
 */
export function useActiveOrders() {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<any[] | null>(null);
  const [markets, setMarkets] = useState<any[]>([]);

  useEffect(() => {
    if (!token || !user) return;
    api.getMarkets().then(setMarkets).catch(() => {});
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) {
      setOrders(null);
      return;
    }
    let cancelled = false;
    function load() {
      api
        .myCustomerOrders()
        .then((all: any[]) => {
          if (cancelled) return;
          setOrders(all.filter((o) => !isHistoryStatus(o.status)));
        })
        .catch(() => {
          // best-effort - a failed poll shouldn't blank out an already-shown banner
        });
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, user]);

  return useMemo(() => {
    if (!orders) return orders;
    return orders.map((o) => ({ ...o, marketName: markets.find((m) => m.id === o.market_id)?.name }));
  }, [orders, markets]);
}
