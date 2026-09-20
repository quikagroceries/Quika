"use client";

import { useMemo } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { isHistoryStatus } from "@/lib/orderStatus";
import { useSharedQuery } from "@/lib/sharedQuery";

const POLL_MS = 10000;

/** Every order the customer has, kept fresh by ONE shared poll however many
 * components use it (header pill, tab-bar dot, banner, the Orders page...),
 * and cached across navigation so revisiting Orders renders instantly.
 * `undefined` until first loaded. */
export function useAllOrders() {
  const { token, user } = useAuth();
  const ready = !!token && !!user;
  const orders = useSharedQuery<any[]>(ready ? `orders:${user.id}` : null, () => api.myCustomerOrders(), POLL_MS);
  const markets = useSharedQuery<any[]>(ready ? "markets" : null, () => api.getMarkets(), 0);
  return { orders: orders.data, markets: markets.data || [], refresh: orders.refresh };
}

/**
 * The customer's in-progress orders (sent, and not delivered/closed/
 * cancelled), each annotated with `marketName` for display. A draft is an
 * unsent LIST, not an order in progress, so it doesn't count. Shared by the
 * header pill, the phone tab-bar dot, the banner and the Orders page so
 * there's exactly one place that decides what "active" means.
 *
 * Returns null while unauthenticated or not yet loaded, [] once loaded with
 * nothing active - callers can tell "still figuring it out" from "genuinely
 * none right now."
 */
export function useActiveOrders() {
  const { orders, markets } = useAllOrders();
  return useMemo(() => {
    if (!orders) return null;
    return orders
      .filter((o) => o.status !== "draft" && !isHistoryStatus(o.status))
      .map((o) => {
        const market = markets.find((m) => m.id === o.market_id);
        return { ...o, market, marketName: market?.name };
      });
  }, [orders, markets]);
}
