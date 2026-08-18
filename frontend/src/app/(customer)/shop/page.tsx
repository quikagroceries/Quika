"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import NewOrderFlow from "@/screens/NewOrderFlow";
import { useAuth } from "@/components/AuthProvider";
import { useShop } from "@/components/shop/ShopContext";

function ShopPageInner() {
  const { user, token } = useAuth();
  const router = useRouter();
  const { setMarkets, setMarketsLoading } = useShop();

  useEffect(() => {
    setMarketsLoading(true);
    api
      .getMarkets()
      .then(setMarkets)
      .catch(() => setMarkets([]))
      .finally(() => setMarketsLoading(false));
  }, [setMarkets, setMarketsLoading]);

  return (
    <>
      <NewOrderFlow
        user={user}
        onCancel={() => router.push(token && user ? "/history" : "/")}
        onOrderPlaced={(orderId: string) => router.push(`/orders/${orderId}`)}
      />
    </>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-ink/50">Loading shop…</div>
      }
    >
      <ShopPageInner />
    </Suspense>
  );
}
