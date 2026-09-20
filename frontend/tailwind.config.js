const tokenColor = (name) => ({ opacityValue } = {}) =>
  opacityValue === undefined
    ? `rgb(var(--${name}))`
    : `rgb(var(--${name}) / ${opacityValue})`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  // Dark mode is a deliberate device-local choice (Settings → Appearance sets
  // [data-theme] on <html>); the semantic tokens below also flip with the OS
  // preference when no explicit choice is made (see globals.css :root blocks).
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Warm-marketplace palette (peach/olive), pivoted back from the
        // indigo experiment: the brand now leans into the hand-drawn market
        // illustration set (src/assets/illustrations) rather than away from
        // it. Token names kept as "orange"/"green" so the whole app recolors
        // from these lines instead of a per-file hunt — read them as
        // "primary accent" / "rare success accent" now.
        brand: {
          // Exact values from the user's extracted design system spec
          // (2026-09-17, from the "Agent Login" reference screen) — the
          // single source of truth for the app's palette now.
          // Burnt-orange shift (was #F5B971 / #EBA655, which read yellow):
          // same family, hue moved ~10deg toward burnt orange. Dark ink text
          // still sits on the primary (~7:1); the -dark shade is the text /
          // hover / icon accent and is deliberately deeper than before.
          orange: "#EE9A5A",
          "orange-dark": "#D9702F",
          green: "#A8AD5C",
          "green-dark": "#8F9448",
        },
        // "gold" is the accent's lighter tint for text/links on dark
        // backgrounds (same peach family, not a third hue).
        gold: "#F6C4A0",
        board: "#1A2E1F",
        // Semantic, theme-aware tokens — resolve to CSS vars that flip
        // between light and dark (globals.css). Everything that should
        // respond to the theme uses these, not raw hex.
        ink: tokenColor("ink"),
        canvas: tokenColor("canvas"),
        "canvas-deep": tokenColor("canvas-deep"),
        chalk: tokenColor("chalk"),
        surface: tokenColor("surface"),
        "surface-2": tokenColor("surface-2"),
        sunken: tokenColor("sunken"),
        "sunken-2": tokenColor("sunken-2"),
        line: tokenColor("line"),
        "line-strong": tokenColor("line-strong"),
        muted: tokenColor("muted"),
        faint: tokenColor("faint"),
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "'DM Sans'", "system-ui", "sans-serif"],
        display: ["var(--font-bricolage)", "'Bricolage Grotesque'", "system-ui", "sans-serif"],
        // Editorial serif — marketing headlines only (see layout.tsx).
        serif: ["var(--font-fraunces)", "'Fraunces'", "Georgia", "serif"],
        // Logo wordmark only ("Qyka" / "Groceries" in the expanded sidebar)
        // - never real UI text.
        logo: ["var(--font-bagel-fat-one)", "'Bagel Fat One'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Elevation scale — warm ink-tinted shadows (not cool default slate)
        // so depth reads as part of the brand, not a generic UI kit. Use the
        // lowest level that still communicates "this is raised" — most cards
        // want xs/sm; reserve lg/pop for things that float above content.
        xs: "0 1px 2px 0 rgb(33 26 20 / 0.05)",
        sm: "0 1px 2px 0 rgb(33 26 20 / 0.04), 0 2px 8px -2px rgb(33 26 20 / 0.06)",
        card: "0 1px 2px 0 rgb(33 26 20 / 0.04), 0 4px 16px -4px rgb(33 26 20 / 0.08)",
        md: "0 2px 6px -1px rgb(33 26 20 / 0.06), 0 8px 24px -6px rgb(33 26 20 / 0.1)",
        lg: "0 4px 12px -2px rgb(33 26 20 / 0.08), 0 16px 40px -12px rgb(33 26 20 / 0.14)",
        pop: "0 8px 24px -4px rgb(33 26 20 / 0.12), 0 24px 56px -16px rgb(33 26 20 / 0.18)",
        stamp: "0 2px 0 0 rgb(33 26 20 / 0.18)",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.16, 1, 0.3, 1)",
        "ease-premium": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      borderRadius: {
        "2xl": "1rem",
        shop: "1.25rem", // shop cards / panels
        "shop-lg": "1.5rem",
      },
      spacing: {
        // Shop rhythm — use these for consistent section/card padding
        "shop-1": "0.5rem",
        "shop-2": "0.75rem",
        "shop-3": "1rem",
        "shop-4": "1.25rem",
        "shop-5": "1.5rem",
        "shop-6": "2rem",
        "shop-8": "3rem",
      },
      keyframes: {
        "splash-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ken-slow": {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.06)" },
        },
        // Route change: a quick fade + 6px rise for the PAGE only (the frame
        // stays put), short enough that it never reads as waiting.
        "page-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "reveal-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "board-in": {
          "0%": { opacity: "0", transform: "translateY(10px) rotate(-1deg)" },
          "100%": { opacity: "1", transform: "translateY(0) rotate(-1deg)" },
        },
        "chalk-in": {
          "0%": { opacity: "0", transform: "translateX(-6px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        // A real overshoot (scales past 1 before settling), not just a
        // fade - for things that should feel like they "jumped" into
        // place (a quick-add chip landing in the list) rather than just
        // faded in, which reads as too quiet for a direct tap response.
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.82) translateY(10px)" },
          "60%": { opacity: "1", transform: "scale(1.04) translateY(-2px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        // A literal hop - drops in then bounces up and down twice with
        // decreasing height, like a ball settling, rather than a single
        // scale overshoot. Vertical `translateY` only (no scale), so it
        // reads as genuine up/down motion.
        "icon-jump": {
          "0%": { opacity: "0", transform: "translateY(-18px)" },
          "35%": { opacity: "1", transform: "translateY(0)" },
          "50%": { transform: "translateY(-9px)" },
          "65%": { transform: "translateY(0)" },
          "78%": { transform: "translateY(-4px)" },
          "90%": { transform: "translateY(0)" },
          "96%": { transform: "translateY(-1px)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        "splash-in": "splash-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-up": "fade-up 0.5s ease-out 0.15s both",
        "ken-slow": "ken-slow 18s ease-out forwards",
        "page-in": "page-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) both",
        "reveal-up": "reveal-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        "board-in": "board-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
        "chalk-in": "chalk-in 0.35s ease-out both",
        // Back-out easing (overshoots past 1 then settles) - the standard
        // curve for a bouncy "pop", paired with the keyframe above.
        "pop-in": "pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "icon-jump": "icon-jump 0.7s ease-out both",
      },
    },
  },
  plugins: [],
};
