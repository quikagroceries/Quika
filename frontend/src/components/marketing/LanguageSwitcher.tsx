"use client";

import { LOCALES } from "@/content/i18n";
import { useLocale } from "@/lib/locale";

/** Small two-way language pill. Same look in the header and the footer. */
export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const [locale, setLocale] = useLocale();
  return (
    <div
      role="group"
      aria-label="Language"
      className={"inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1 " + className}
    >
      <svg viewBox="0 0 24 24" className="ml-1.5 h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z" />
      </svg>
      {LOCALES.map((l) => (
        <button
          key={l.key}
          type="button"
          onClick={() => setLocale(l.key)}
          aria-pressed={locale === l.key}
          aria-label={l.label}
          className={
            "rounded-full px-2.5 py-1 text-xs font-bold transition " +
            (locale === l.key ? "bg-brand-orange text-[#1A1A1A]" : "text-muted hover:text-ink")
          }
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
