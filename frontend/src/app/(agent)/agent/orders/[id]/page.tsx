"use client";

import { useParams, useRouter } from "next/navigation";
import Shopping from "@/screens/Shopping";

export default function AgentOrderPage() {
  const { id } = useParams();
  const router = useRouter();

  return (
    <Shopping
      orderId={id}
      onBack={() => router.push("/agent")}
    />
  );
}
