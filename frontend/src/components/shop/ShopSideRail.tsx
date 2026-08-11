"use client";

import Icon from "@/components/Icon";
import { stallTypeLabel } from "@/lib/stallCatalog";
import type { VenueType } from "@/lib/marketDirectory";

type NavItem = {
  id: string;
  label: string;
  icon?: "store" | "basket" | "flag" | "wallet" | "star" | "user" | "clock" | "pin";
  hint?: string;
  active?: boolean;
  onClick: () => void;
};

function RailSection({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"mt-6 first:mt-0 " + className}>
      <p className="mb-2 px-3 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#8a8178]">
        {label}
      </p>
      {children}
    </div>
  );
}

function RailBtn({ item }: { item: NavItem }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      className={
        "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition " +
        (item.active
          ? "bg-brand-orange/[0.08] font-bold text-ink"
          : "font-medium text-[#5c534a] hover:bg-[#f7f5f2]")
      }
    >
      {item.active && (
        <span
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-orange"
          aria-hidden
        />
      )}
      {item.icon && <Icon name={item.icon} className="h-4 w-4 shrink-0 opacity-70" />}
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug">{item.label}</span>
        {item.hint && (
          <span className="mt-0.5 block text-[0.7rem] font-medium text-[#8a8178]">{item.hint}</span>
        )}
      </span>
    </button>
  );
}

function ContextCard({
  eyebrow,
  title,
  subtitle,
  onBack,
  backLabel,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <div className="mb-1 rounded-2xl border border-[#ebe7e0] bg-[#faf9f7] p-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#8a8178]">
        {eyebrow}
      </p>
      <p className="mt-1 truncate font-display text-base font-extrabold tracking-tight text-ink">
        {title}
      </p>
      {subtitle && <p className="mt-0.5 truncate text-xs text-[#6b635a]">{subtitle}</p>}
      <button
        type="button"
        onClick={onBack}
        className="mt-2.5 text-xs font-bold text-brand-orange hover:underline"
      >
        ← {backLabel}
      </button>
    </div>
  );
}

function Tip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={
        "rounded-xl border border-[#ebe7e0] bg-white px-3 py-2.5 text-[0.75rem] leading-relaxed text-[#6b635a] " +
        className
      }
    >
      {children}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex w-full items-center justify-center rounded-full px-3 py-2.5 text-sm font-bold transition " +
        (primary
          ? "bg-brand-orange text-white hover:brightness-105"
          : "border border-[#ddd6cb] bg-white text-ink hover:bg-[#faf9f7]")
      }
    >
      {label}
    </button>
  );
}

/**
 * Contextual left rail — contents change to assist the open section:
 * browse · market stalls · stall menu · list composer.
 */
export function ShopSideRail({
  mode,
  venueType,
  venueCounts,
  onSelectVenueType,
  food,
  foodFilters,
  onSelectFood,
  market,
  stall,
  preferredVendor,
  stallTypeFilter,
  onStallTypeFilter,
  stallTypeFilters,
  stallCategories,
  stallCategory,
  onStallCategory,
  listComposerMode,
  onListComposerMode,
  listTools,
  onGoVendors,
  onBackToStall,
  onGoList,
  onShopWholeMarket,
  onWriteOwnList,
  onBackToMarkets,
  onCloseStall,
}: {
  mode: "browse" | "vendors" | "stall" | "list";
  venueType: VenueType;
  venueCounts: { local_market: number; supermarket: number };
  onSelectVenueType: (id: VenueType) => void;
  food: string;
  foodFilters: { id: string; label: string; icon: string }[];
  onSelectFood: (id: string) => void;
  market?: any | null;
  stall?: { id: string; name: string; stall_description?: string | null } | null;
  preferredVendor?: { id: string; name: string } | null;
  stallTypeFilter: string;
  onStallTypeFilter: (id: string) => void;
  stallTypeFilters: { id: string; label: string; icon: "store" | "basket" | "flag" | "wallet" }[];
  stallCategories: { id: string; label: string }[];
  stallCategory: string;
  onStallCategory: (id: string) => void;
  listComposerMode: "detailed" | "freetext";
  onListComposerMode: (id: "detailed" | "freetext") => void;
  listTools: { id: "detailed" | "freetext"; label: string; icon: "basket" | "flag" }[];
  onGoVendors: () => void;
  onBackToStall: () => void;
  onGoList: () => void;
  onShopWholeMarket: () => void;
  onWriteOwnList: () => void;
  onBackToMarkets: () => void;
  onCloseStall: () => void;
}) {
  const isSuper = (market?.venue_type || "local_market") === "supermarket";
  const marketArea = [market?.city, market?.state].filter(Boolean).join(", ");

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[220px] shrink-0 flex-col border-r border-[#ebe7e0] bg-white xl:w-[240px] lg:flex">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
        {mode === "browse" && (
          <>
            <RailSection label="Shop from">
              <nav className="space-y-0.5">
                {(
                  [
                    {
                      id: "local_market" as VenueType,
                      label: "Local Markets",
                      hint: `${venueCounts.local_market} · Bargain live`,
                      icon: "basket" as const,
                    },
                    {
                      id: "supermarket" as VenueType,
                      label: "Supermarkets",
                      hint: `${venueCounts.supermarket} · Fixed prices`,
                      icon: "store" as const,
                    },
                  ] as const
                ).map((v) => (
                  <RailBtn
                    key={v.id}
                    item={{
                      id: v.id,
                      label: v.label,
                      hint: v.hint,
                      icon: v.icon,
                      active: venueType === v.id,
                      onClick: () => onSelectVenueType(v.id),
                    }}
                  />
                ))}
              </nav>
            </RailSection>

            <RailSection label="Categories">
              <nav className="space-y-0.5">
                {foodFilters.map((f) => (
                  <RailBtn
                    key={f.id}
                    item={{
                      id: f.id,
                      label: f.label,
                      icon: f.icon as NavItem["icon"],
                      active: food === f.id,
                      onClick: () => onSelectFood(f.id),
                    }}
                  />
                ))}
              </nav>
            </RailSection>

            <div className="mt-auto pt-6">
              <Tip>
                <span className="font-semibold text-ink">Pick a venue</span> to browse stalls or
                build a list. Agents shop and deliver for you.
              </Tip>
            </div>
          </>
        )}

        {mode === "vendors" && market && (
          <>
            <ContextCard
              eyebrow="Market"
              title={market.name}
              subtitle={
                marketArea
                  ? `${isSuper ? "Supermarket" : "Open-air"} · ${marketArea}`
                  : isSuper
                    ? "Supermarket"
                    : "Open-air market"
              }
              onBack={onBackToMarkets}
              backLabel="All markets"
            />

            <RailSection label="Browse stalls">
              <nav className="space-y-0.5">
                {stallTypeFilters.map((f) => (
                  <RailBtn
                    key={f.id}
                    item={{
                      id: f.id,
                      label: f.label,
                      icon: f.icon,
                      active: stallTypeFilter === f.id,
                      onClick: () => onStallTypeFilter(f.id),
                    }}
                  />
                ))}
              </nav>
            </RailSection>

            <Tip className="mt-6">
              <span className="font-semibold text-ink">Soft prefer a stall</span> — your agent still
              shops the wider market if something isn’t there.
            </Tip>

            <div className="mt-auto border-t border-[#ebe7e0] pt-4">
              <RailSection label="Shortcuts" className="!mt-0">
                <div className="space-y-2 px-0.5">
                  <ActionBtn label="Shop whole market →" onClick={onShopWholeMarket} primary />
                  <ActionBtn label="Build list" onClick={onGoList} />
                </div>
              </RailSection>
            </div>
          </>
        )}

        {mode === "stall" && market && stall && (
          <>
            <ContextCard
              eyebrow="Stall"
              title={stall.name}
              subtitle={`${stallTypeLabel(stall.stall_description, stall.name)} · ${market.name}`}
              onBack={onCloseStall}
              backLabel="All stalls"
            />

            <RailSection label="On this stall">
              <nav className="space-y-0.5">
                {stallCategories.map((c) => (
                  <RailBtn
                    key={c.id}
                    item={{
                      id: c.id,
                      label: c.label,
                      active: stallCategory === c.id,
                      onClick: () => onStallCategory(c.id),
                    }}
                  />
                ))}
              </nav>
            </RailSection>

            <Tip className="mt-6">
              <span className="font-semibold text-ink">Bargain estimates</span> — not shelf tags.
              Your agent negotiates the real price at the stall.
            </Tip>

            <div className="mt-auto border-t border-[#ebe7e0] pt-4">
              <RailSection label="Actions" className="!mt-0">
                <div className="space-y-2 px-0.5">
                  <ActionBtn label="Write my own list" onClick={onWriteOwnList} primary />
                  <ActionBtn label="Shop whole market" onClick={onShopWholeMarket} />
                </div>
              </RailSection>
            </div>
          </>
        )}

        {mode === "list" && market && (
          <>
            <ContextCard
              eyebrow={isSuper ? "Cart" : "List"}
              title={isSuper ? "Build your cart" : "Build your list"}
              subtitle={
                preferredVendor
                  ? `${market.name} · prefer ${preferredVendor.name}`
                  : market.name
              }
              onBack={
                isSuper
                  ? onBackToMarkets
                  : preferredVendor
                    ? onBackToStall
                    : onGoVendors
              }
              backLabel={
                isSuper
                  ? "All markets"
                  : preferredVendor
                    ? preferredVendor.name
                    : "All stalls"
              }
            />

            <RailSection label="Compose">
              <nav className="space-y-0.5">
                {listTools.map((f) => (
                  <RailBtn
                    key={f.id}
                    item={{
                      id: f.id,
                      label: f.label,
                      icon: f.icon,
                      hint: f.id === "detailed" ? "Item + expected ₦" : "Paste lines + budget",
                      active: listComposerMode === f.id,
                      onClick: () => onListComposerMode(f.id),
                    }}
                  />
                ))}
              </nav>
            </RailSection>

            {!isSuper && (
              <RailSection label="Shopping style">
                <nav className="space-y-0.5">
                  <RailBtn
                    item={{
                      id: "stalls",
                      label: "Browse stalls",
                      icon: "store",
                      onClick: onGoVendors,
                    }}
                  />
                  {preferredVendor && (
                    <div className="mx-1 rounded-xl bg-brand-orange/[0.08] px-3 py-2 text-xs text-[#6b635a]">
                      Soft prefer{" "}
                      <span className="font-bold text-ink">{preferredVendor.name}</span>
                    </div>
                  )}
                </nav>
              </RailSection>
            )}

            <div className="mt-auto pt-6">
              <Tip>
                {isSuper ? (
                  <>
                    <span className="font-semibold text-ink">Shelf prices</span> — what you enter is
                    closer to checkout. Quika still picks and delivers.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-ink">Your estimate</span> — real prices come
                    from bargaining. Add notes for ripeness, size, or brand.
                  </>
                )}
              </Tip>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

export default ShopSideRail;
