
// Shown instantly while a customer page's code loads on navigation. It renders
// INSIDE the layout, so the sidebar/header/tab bar are already on screen and
// only this placeholder is what waits - a tap always answers immediately.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-56 rounded-3xl border border-line bg-surface shadow-sm" />
      <div className="h-11 w-full max-w-md rounded-full bg-sunken-2" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-3xl border border-line bg-surface shadow-sm" />
        ))}
      </div>
    </div>
  );
}
