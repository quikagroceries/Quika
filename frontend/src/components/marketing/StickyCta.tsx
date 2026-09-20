"use client";

import { useEffect, useState } from "react";

interface StickyCtaProps {
  label?: string;
  href?: string;
  heroId?: string;
  footerId?: string;
}

export function StickyCta({ 
  label = "Start your list — free, no sign-up", 
  href = "/shop",
  heroId = "hero",
  footerId = "final-cta"
}: StickyCtaProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let heroPast = false;
    let footerPresent = false;

    const checkVisibility = () => {
      setIsVisible(heroPast && !footerPresent);
    };

    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        // If hero is NOT intersecting and its bounding box is above the viewport
        if (!entry.isIntersecting && entry.boundingClientRect.bottom < 0) {
          heroPast = true;
        } else {
          heroPast = false;
        }
        checkVisibility();
      },
      { threshold: 0 }
    );

    const footerObserver = new IntersectionObserver(
      ([entry]) => {
        footerPresent = entry.isIntersecting;
        checkVisibility();
      },
      { threshold: 0, rootMargin: "200px 0px 0px 0px" } // Hide when footer is near
    );

    const heroEl = document.getElementById(heroId);
    const footerEl = document.getElementById(footerId);

    if (heroEl) heroObserver.observe(heroEl);
    if (footerEl) footerObserver.observe(footerEl);

    return () => {
      heroObserver.disconnect();
      footerObserver.disconnect();
    };
  }, [heroId, footerId]);

  return (
    <div 
      className={`fixed bottom-0 inset-x-0 z-30 lg:hidden transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!isVisible}
    >
      <div className="mx-auto max-w-lg px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        <a 
          href={href} 
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange px-6 min-h-[52px] font-display font-bold text-[#1A1A1A] shadow-lg active:scale-[0.98] transition"
        >
          {label}
        </a>
      </div>
    </div>
  );
}
