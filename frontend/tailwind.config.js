/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#E8541E",
          "orange-dark": "#C2430F",
          green: "#0E7A3C",
          "green-dark": "#0B5F2E",
        },
        // Marketing palette — market subject, not SaaS defaults
        ink: "#211A14",
        canvas: "#EFE6D9",
        "canvas-deep": "#E4D8C6",
        gold: "#F2B705",
        chalk: "#F4F0E6",
        board: "#1A2E1F",
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        display: ["var(--font-bricolage)", "'Bricolage Grotesque'", "system-ui", "sans-serif"],
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
      },
      animation: {
        "splash-in": "splash-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-up": "fade-up 0.5s ease-out 0.15s both",
        "ken-slow": "ken-slow 18s ease-out forwards",
        "reveal-up": "reveal-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        "board-in": "board-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
        "chalk-in": "chalk-in 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};
