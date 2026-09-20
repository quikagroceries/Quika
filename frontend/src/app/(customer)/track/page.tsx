"use client";

import { Suspense } from "react";
import Orders from "@/screens/Orders";

// Suspense: Orders reads ?tab= via useSearchParams.
export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <Orders />
    </Suspense>
  );
}
