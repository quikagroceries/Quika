'use client';

// Generic skeleton rectangle — the building block.
export function Skeleton({ className = "" }: any) {
  return <div className={"animate-pulse rounded-lg bg-slate-200 " + className} />;
}

// Shaped to roughly match an order card (badge row + title + total), so the
// loading state reads as "this content is coming," not a blank gray block.
export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="mt-4 h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  );
}

export default Skeleton;
