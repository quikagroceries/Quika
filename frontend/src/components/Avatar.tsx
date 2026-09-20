'use client';

import Icon from "./Icon";

// A person's profile photo, or - when they haven't added one - their initials
// on the brand tint (or a generic user glyph when there's nothing to take
// initials from). One component so every place an account appears (sidebar,
// header menus, settings, the agent card a customer sees) shows the same
// thing and falls back the same way.
function initialsOf(name?: string | null) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function Avatar({ src, name, className = "h-8 w-8", iconClassName = "h-4 w-4" }: any) {
  const base = "flex shrink-0 items-center justify-center overflow-hidden rounded-full ";
  if (src) {
    return (
      <span className={base + className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name ? `${name}'s photo` : "Profile photo"} className="h-full w-full object-cover" />
      </span>
    );
  }
  const initials = initialsOf(name);
  return (
    <span className={base + "bg-brand-orange/20 font-display text-xs font-bold text-brand-orange-dark ring-1 ring-brand-orange/30 " + className}>
      {initials || <Icon name="user" className={iconClassName} />}
    </span>
  );
}

export default Avatar;
