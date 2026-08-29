'use client';

// One tooltip shape for every admin chart (recharts' default is a plain
// white box in the browser's UI font) - matches the app's own Card
// treatment instead of looking like a different product bolted on.
function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-[#ebe7e0] bg-white px-3 py-2 shadow-[0_8px_20px_rgba(33,26,20,0.1)]">
      {label && (
        <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-wide text-[#8a8178]">{label}</p>
      )}
      {payload.map((p: any, i: number) => {
        const [value, name] = formatter ? formatter(p.value, p.name, p) : [p.value, p.name];
        return (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
            <span className="font-semibold tabular-nums text-ink">{value}</span>
            {name && <span className="text-[#8a8178]">{name}</span>}
          </div>
        );
      })}
    </div>
  );
}

export default ChartTooltip;
