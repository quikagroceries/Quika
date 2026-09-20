import type { ReactNode } from "react";
import Icon from "@/components/Icon";

/**
 * The one page header for every admin screen. Same family as the customer
 * hero (rounded card, hairline border, peach icon well) but deliberately
 * quieter - no illustration, no glow, tight padding - because admins scan
 * data all day and the header shouldn't compete with it.
 */
export default function AdminPageHeader({
  icon,
  section,
  title,
  description,
  actions,
  children,
}: {
  icon: string;
  section: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** e.g. a StatTile row summarising the page */
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/20 text-brand-orange-dark">
            <Icon name={icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-faint">Admin · {section}</p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-sm text-muted sm:text-base">{description}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children && <div className="mt-5 border-t border-dashed border-line pt-5">{children}</div>}
    </header>
  );
}
