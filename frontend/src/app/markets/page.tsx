"use client";

import { Suspense } from "react";
import MarketsDirectory from "@/screens/MarketsDirectory";

export default function MarketsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-canvas text-ink/50">
          Loading markets…
        </div>
      }
    >
      <MarketsDirectory />
    </Suspense>
  );
}
