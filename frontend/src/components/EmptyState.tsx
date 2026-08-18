'use client';

import Icon from "./Icon";

// A designed empty state (icon + heading + optional subtext) instead of a
// bland "No orders yet." line — used wherever a list has nothing to show.
function EmptyState({ icon = "basket", title, subtitle }: any) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#ddd6cb] bg-white/60 px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0eeeb] text-[#8a8178]">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-[#6b635a]">{subtitle}</p>}
    </div>
  );
}

export default EmptyState;
