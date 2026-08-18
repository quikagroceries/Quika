"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { OrderDetailPanel } from "@/screens/AdminOrders";
import { CardSkeleton } from "@/components/Skeleton";

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [markets, setMarkets] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([api.getAllMarkets(), api.listAgents()])
      .then(([m, a]) => { setMarkets(m); setAgents(a); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <CardSkeleton />;

  return (
    <OrderDetailPanel
      orderId={id}
      markets={markets}
      agents={agents}
      onBack={() => router.push("/admin/orders")}
    />
  );
}
