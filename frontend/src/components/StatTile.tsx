'use client';

// A small labelled figure on a soft tile - the summary-number pattern used
// under heroes (Track's counts, Wallet's monthly figures). `tone` colors the
// value only: green for money in, default ink otherwise.
function StatTile({ label, value, tone = "ink", className = "" }: any) {
  return (
    <div className={"rounded-2xl bg-sunken-2/70 p-3 " + className}>
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-faint">{label}</p>
      <p
        className={
          "mt-1 font-display text-xl font-extrabold tabular-nums " +
          (tone === "green" ? "text-brand-green" : "text-ink")
        }
      >
        {value}
      </p>
    </div>
  );
}

export default StatTile;
