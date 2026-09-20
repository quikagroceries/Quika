'use client';

// The one selectable-pill pattern: solid peach with dark ink text when
// selected, a bordered white pill otherwise. Filter chips, quick amounts,
// category pills all had their own copy of this (some with a black selected
// state, some borderless grey that vanished into the cream background);
// this is the single version so they can't drift apart again.
function Chip({ selected = false, size = "md", className = "", children, ...props }: any) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-bold transition " +
        (size === "sm" ? "px-3 py-1.5 text-xs " : "h-9 px-3.5 text-sm ") +
        (selected
          ? "border-transparent bg-brand-orange text-[#1A1A1A] shadow-xs "
          : "border-line-strong bg-surface text-ink hover:border-brand-orange/40 hover:bg-brand-orange/10 ") +
        className
      }
    >
      {children}
    </button>
  );
}

export default Chip;
