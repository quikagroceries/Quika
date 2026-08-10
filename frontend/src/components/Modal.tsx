'use client';

import { useEffect } from "react";
import Icon from "./Icon";

// One reusable focused-modal shell: blurred/dimmed backdrop, bottom sheet on
// mobile, centered card on desktop (matches the app's card look - white,
// rounded-2xl, shadow-card). Omit `onClose` to make the modal only
// closeable via an explicit in-modal action (e.g. the agent-selection
// modal, which must be resolved via Accept/See another, not dismissed) -
// when provided, backdrop click and Escape both dismiss.
function Modal({ open, onClose, title, children, className = "" }: any) {
  useEffect(() => {
    if (!open || !onClose) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1900] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          "w-full max-w-md animate-fade-up rounded-t-2xl bg-white p-5 shadow-card sm:rounded-2xl " +
          className
        }
      >
        {(title || onClose) && (
          <div className="mb-3 flex items-center justify-between">
            {title ? <p className="text-lg font-bold text-slate-900">{title}</p> : <span />}
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="-m-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default Modal;
