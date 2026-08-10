"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import NewOrderFlow from "@/screens/NewOrderFlow";
import { useAuth } from "@/components/AuthProvider";

export default function ShopPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);

  useEffect(() => {
    api.getMarkets()
      .then(setMarkets)
      .catch(() => {})
      .finally(() => setMarketsLoading(false));
  }, []);

  return (
    <NewOrderFlow
      user={user}
      markets={markets}
      marketsLoading={marketsLoading}
      onCancel={() => router.push("/history")}
      onOrderPlaced={(orderId) => router.push(`/orders/${orderId}`)}
    />
  );
}
