/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:        "var(--color-background)",
        surface:   "var(--color-surface)",
        elevated:  "var(--color-elevated)",
        sidebar:   "var(--color-sidebar)",
        border:    "var(--color-border)",
        accent:    "var(--color-accent)",
        healthy:   "var(--color-healthy)",
        warning:   "var(--color-warning)",
        critical:  "var(--color-critical)",
        "text-main":  "var(--color-text-main)",
        "text-muted": "var(--color-text-muted)",
        "text-dim":   "var(--color-text-dim)",
      },
      fontFamily: {
        sans:    ["Sora", "Outfit", "system-ui", "sans-serif"],
        display: ["Sora", "sans-serif"],
        tech:    ["Space Grotesk", "sans-serif"],
        mono:    ["JetBrains Mono", "Consolas", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "12px",
        md: "14px",
        lg: "18px",
        xl: "24px",
        "2xl": "28px",
      },
      animation: {
        "status-pulse": "status-pulse 1.8s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in": "slide-in-right 0.2s ease-out",
      },
      boxShadow: {
        "card": "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px var(--color-border)",
        "accent-glow": "0 0 16px var(--color-accent-glow)",
        "panel": "0 8px 32px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
