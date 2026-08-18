'use client';

// Horizontal row of tappable status-filter pills, used above both order
// lists (agent + customer). Scrolls horizontally if it overflows narrow
// screens rather than wrapping awkwardly.

function FilterPills({ options, value, onChange }: any) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={
            "shrink-0 whitespace-nowrap rounded-full px-4 min-h-[44px] text-sm font-bold transition-colors duration-150 " +
            (value === opt.key
              ? "bg-ink text-white"
              : "bg-[#f0eeeb] text-[#6b635a] hover:bg-[#e8e4df]")
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default FilterPills;
