/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#E8541E",       // primary — main buttons, key actions, active states
          "orange-dark": "#C2430F", // hover/active shade of primary
          green: "#0E7A3C",        // secondary/success — confirmations, "paid"/"bought", secondary buttons
          "green-dark": "#0B5F2E", // hover/active shade of secondary
        },
      },
      fontFamily: {
        // One family, used across weights for both body and display text —
        // simpler and more cohesive than pairing two typefaces.
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Layered card shadow — softer and deeper than Tailwind's default
        // `shadow-sm`, for the "layered, not flat" card look.
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.08)",
      },
      borderRadius: {
        "2xl": "1rem",
      },
      keyframes: {
        // Splash entrance: subtle fade+scale, not a heavy animation library.
        "splash-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "splash-in": "splash-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-up": "fade-up 0.5s ease-out 0.15s both",
      },
    },
  },
  plugins: [],
}
