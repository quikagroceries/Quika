import Icon from "./Icon";

// A designed empty state (icon + heading + optional subtext) instead of a
// bland "No orders yet." line — used wherever a list has nothing to show.
function EmptyState({ icon = "basket", title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <p className="text-lg font-semibold text-slate-700">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

export default EmptyState;
