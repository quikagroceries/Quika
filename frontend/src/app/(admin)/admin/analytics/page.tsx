"use client";

import dynamic from "next/dynamic";
import { CardSkeleton } from "@/components/Skeleton";

const AdminAnalytics = dynamic(() => import("@/screens/AdminAnalytics"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}
    </div>
  ),
});

export default function Page() {
  return <AdminAnalytics />;
}
