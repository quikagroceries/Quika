'use client';

import Icon from "./Icon";

// The app's on/off switch. Two states you can read at a glance: a peach
// track with a check in the thumb when ON, a clearly-grey (not near-white)
// track when OFF - the old one's off state disappeared into the cream page.
// The thumb has real depth (shadow + hairline ring) and slides on the same
// premium easing as everything else. Purely visual: wrap it in whatever
// button/label does the toggling (see SwitchRow).
export function SwitchTrack({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        "relative inline-block h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-premium " +
        (checked ? "bg-brand-orange" : "bg-ink/20")
      }
    >
      <span
        className={
          "absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface text-brand-orange-dark shadow-md ring-1 ring-black/5 transition-transform duration-200 ease-premium " +
          (checked ? "translate-x-5" : "translate-x-0")
        }
      >
        <Icon name="check" className={"h-3.5 w-3.5 transition-opacity duration-200 " + (checked ? "opacity-100" : "opacity-0")} />
      </span>
    </span>
  );
}

// A whole settings row as ONE switch: label, hint and track are a single
// button, so the entire row is the tap target (not just a tiny pill at the
// edge) and there's exactly one thing to focus and announce.
function SwitchRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl px-1 py-3 text-left transition hover:bg-sunken-2/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <SwitchTrack checked={checked} />
    </button>
  );
}

export default SwitchRow;
