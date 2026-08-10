'use client';

import Card from "./Card";
import Button from "./Button";
import EmptyState from "./EmptyState";
import Icon from "./Icon";
import { CardSkeleton } from "./Skeleton";

// Phase 3 of the new-order funnel: pick which market this order shops at.
// Every market renders as a tappable card - store icon, name, location, chevron.
function MarketPicker({ markets, loading, onSelect, onCancel }: any) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            Choose a market
          </h1>
          <p className="mt-1 text-slate-500">Where should your agent shop?</p>
        </div>
        <Button variant="neutral" onClick={onCancel}>Cancel</Button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {!loading && markets.length === 0 && (
        <EmptyState icon="store" title="No markets available yet" subtitle="Check back shortly." />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!loading && markets.map((m) => (
          <Card key={m.id} interactive onClick={() => onSelect(m)} className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <Icon name="store" className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-slate-900">{m.name}</div>
              <div className="truncate text-sm text-slate-500">{m.city}, {m.state}</div>
            </div>
            <span className="shrink-0 text-xl text-slate-300">›</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default MarketPicker;
