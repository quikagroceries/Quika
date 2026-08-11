"use client";

import { useParams, useRouter } from "next/navigation";
import OrderDetail from "@/screens/OrderDetail";

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  return (
    <OrderDetail
      orderId={id}
      onBack={() => router.push("/history")}
      onTopUpWallet={() => router.push("/wallet")}
    />
  );
}
