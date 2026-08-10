import { useEffect } from "react";
import logo from "../assets/logo.png";
import Icon from "./Icon";
import RoleSwitch from "./RoleSwitch";

// The off-canvas nav drawer for <md: screens. Stays mounted at all times
// (never conditionally unmounted) so the slide transition always animates
// instead of popping in/out — visibility is purely `open` toggling
// transform/opacity classes.
function MobileDrawer({ open, onClose, navItems, activeKey, onNavigate, user, onLogout, roleSwitch }) {
  // Escape closes it; body scroll is locked while it's open, both common
  // drawer conventions that are cheap to get right here.
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <div className="md:hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={
          "fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-300 " +
          (open ? "opacity-100" : "pointer-events-none opacity-0")
        }
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] transform flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex items-center justify-between px-4 py-5">
          <img src={logo} alt="Quika Groceries" className="h-9 w-auto object-contain" />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 active:bg-slate-200"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {roleSwitch && (
          <div className="px-4 pb-3">
            <RoleSwitch {...roleSwitch} />
          </div>
        )}

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active = item.key === activeKey;
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); onClose(); }}
                className={
                  "flex w-full items-center gap-3 rounded-xl px-3 min-h-[44px] text-base font-semibold transition-colors " +
                  (active
                    ? "bg-brand-orange/10 text-brand-orange"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
                }
              >
                <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <button
            onClick={() => { onNavigate("settings"); onClose(); }}
            className="mb-2 flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-slate-100"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Icon name="user" className="h-4 w-4" />
            </span>
            <span className="truncate text-sm text-slate-500">{user?.phone}</span>
          </button>
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 min-h-[44px] text-base font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Icon name="logout" className="h-5 w-5 shrink-0" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileDrawer;
