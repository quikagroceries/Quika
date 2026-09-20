"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useT } from "@/lib/locale";

const SEEN = "qyka_lang_prompted";

/**
 * A soft, one-time offer - never a blocking pop-up. It appears only in
 * English, only after the visitor has actually scrolled (or lingered), and
 * is gone for good once answered either way.
 */
export default function LanguagePrompt() {
  const [locale, setLocale] = useLocale();
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN) === "1";
    } catch {
      /* ignore */
    }
    if (seen || locale !== "en") return;
    const reveal = () => setShow(true);
    const timer = setTimeout(reveal, 20000);
    const onScroll = () => window.scrollY > 700 && reveal();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [locale]);

  function answer(usePidgin: boolean) {
    try {
      localStorage.setItem(SEEN, "1");
    } catch {
      /* ignore */
    }
    if (usePidgin) setLocale("pcm");
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && locale === "en" && (
        <motion.div
          role="dialog"
          aria-label="Language"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="fixed bottom-4 left-4 z-[60] w-[min(20rem,calc(100vw-2rem))] rounded-3xl border border-line bg-surface p-4 shadow-lg"
        >
          <p className="font-display text-lg font-extrabold text-ink">{t.prompt.title}</p>
          <p className="mt-0.5 text-sm text-muted">{t.prompt.body}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => answer(true)}
              className="min-h-[44px] flex-1 rounded-2xl bg-brand-orange px-3 font-display text-sm font-bold text-[#1A1A1A] transition hover:bg-brand-orange-dark active:scale-[0.98]"
            >
              {t.prompt.yes}
            </button>
            <button
              type="button"
              onClick={() => answer(false)}
              className="min-h-[44px] rounded-2xl border border-line-strong px-3 font-display text-sm font-bold text-ink transition hover:bg-sunken"
            >
              {t.prompt.no}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
