'use client';

import Icon from "./Icon";

// Card/section title with the app's icon well: a small peach circle holding
// an icon, then the title (and optional subtitle / right-side action). This
// exact markup was hand-copied into a dozen cards; one component now.
// `solid` is the stronger variant used on attention (peach-tinted) cards.
function SectionHeader({ icon, title, subtitle, action, solid = false, className = "" }: any) {
  return (
    <div className={"flex items-center gap-2.5 " + className}>
      {icon && (
        <span
          className={
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full " +
            (solid ? "bg-brand-orange text-[#1A1A1A]" : "bg-brand-orange/15 text-brand-orange-dark")
          }
        >
          <Icon name={icon} className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-display font-bold text-ink">{title}</p>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export default SectionHeader;
