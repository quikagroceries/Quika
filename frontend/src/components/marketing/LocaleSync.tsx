"use client";

import { useEffect } from "react";
import { syncDocLang } from "@/lib/locale";

/** Sets <html lang> from the saved language choice once the app loads. */
export default function LocaleSync() {
  useEffect(() => {
    syncDocLang();
  }, []);
  return null;
}
