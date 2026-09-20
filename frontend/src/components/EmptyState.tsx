"use client";

import Image, { type StaticImageData } from "next/image";
import Icon from "./Icon";
import groceryBasket from "@/assets/illustrations/grocery-basket.png";

export interface EmptyStateProps {
  icon?: string;
  image?: StaticImageData;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  image = groceryBasket,
  title,
  subtitle,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-3xl border border-line bg-surface/80 p-8 text-center shadow-xs backdrop-blur-sm sm:p-12 ${className}`}
    >
      <div className="relative mb-4 h-24 w-24 sm:h-28 sm:w-28">
        {image ? (
          <Image src={image} alt="" className="h-full w-full object-contain drop-shadow-sm" priority />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sunken-2 text-muted">
            <Icon name={icon || "basket"} className="h-8 w-8" />
          </div>
        )}
      </div>

      <h3 className="font-display text-lg font-bold text-ink sm:text-xl">{title}</h3>
      {subtitle && <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted sm:text-sm">{subtitle}</p>}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center justify-center rounded-2xl bg-brand-orange px-5 py-2.5 text-xs font-bold text-[#1A1A1A] shadow-xs transition hover:bg-brand-orange-dark active:bg-brand-orange-dark"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
