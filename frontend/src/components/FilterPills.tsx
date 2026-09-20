'use client';

import { useLayoutEffect, useRef, useState } from "react";

// Two shapes, one component, because the two jobs are different:
//
//  - "segmented": a binary/primary mode switch (Order vs List history,
//    same idea as ListBuilder's Detailed/Free-text toggle) - a `canvas-deep`
//    track, equal-width segments that fill the row, and a WHITE selected
//    segment with a soft shadow. Deliberately not peach: peach is the
//    "you're here" color for navigation, this is a mode toggle, and the
//    ListBuilder toggle it mirrors already uses white-on-track.
//
//  - "tabs" (default): a secondary filter row - plain text with a thin
//    underline that slides to the selected option. Quieter on purpose, so
//    a filter sitting under a segmented switch reads as "narrowing within
//    that", not as a second identical switcher stacked on the first. Also
//    scrolls horizontally, since a status filter can have six options.
//
// Both slide a single indicator (measured from the real button box, so
// options of very different widths fit exactly) instead of each option
// flipping its own background.
function FilterPills({ options, value, onChange, variant = "tabs", className = "mb-4" }: any) {
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  const segmented = variant === "segmented";

  useLayoutEffect(() => {
    function measure() {
      const btn = btnRefs.current[value];
      if (!btn || !trackRef.current) return;
      setThumb({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, options]);

  return (
    <div
      ref={trackRef}
      role="tablist"
      className={
        (segmented
          ? "relative flex rounded-full border border-line bg-canvas-deep p-1 "
          : "relative flex gap-1 overflow-x-auto border-b border-line-strong ") + className
      }
    >
      {thumb && (
        <div
          aria-hidden="true"
          className={
            "absolute transition-all duration-300 ease-premium " +
            (segmented
              ? "inset-y-1 rounded-full bg-surface shadow-sm"
              : "bottom-0 h-[3px] rounded-full bg-brand-orange")
          }
          style={{ left: thumb.left, width: thumb.width }}
        />
      )}
      {options.map((opt) => (
        <button
          key={opt.key}
          ref={(el) => { btnRefs.current[opt.key] = el; }}
          role="tab"
          aria-selected={value === opt.key}
          onClick={() => onChange(opt.key)}
          className={
            segmented
              ? "relative z-10 flex-1 rounded-full py-2.5 text-sm font-bold transition-colors " +
                (value === opt.key ? "text-ink" : "text-muted hover:text-ink")
              : "relative z-10 shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-bold transition-colors " +
                (value === opt.key ? "text-ink" : "text-faint hover:text-ink")
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default FilterPills;
