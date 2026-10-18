/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },

      colors: {
        // surfaces & text
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        foreground: "var(--foreground)",
        muted: "var(--muted-foreground)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",

        // brand
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          foreground: "var(--primary-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },

        // semantic
        gold: "var(--gold)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },

      // 🎨 Nova gradients — Midnight → Lavender family
      backgroundImage: {
        "grad-text": "var(--grad-text)",
        "grad-ring": "var(--grad-ring)",
        "grad-media": "var(--grad-media)",
        "grad-btn": "var(--grad-btn)",
        "grad-soft": "var(--grad-soft)",
      },

      // 🌟 glow shadows — premium feel
      boxShadow: {
        glow: "0 0 40px -8px var(--glow)",
        "glow-sm": "0 0 20px -6px var(--glow)",
        "glow-lg": "0 20px 60px -20px var(--glow)",
        card: "0 1px 2px rgba(0,0,0,.04), 0 8px 24px -12px rgba(0,0,0,.08)",
        "card-dark":
          "0 1px 2px rgba(0,0,0,.4), 0 12px 32px -16px rgba(0,0,0,.5)",
        "card-hover": "0 24px 60px -24px var(--glow)",
      },

      // 🎬 animations — premium, lightweight
      animation: {
        flow: "flow 14s ease infinite",
        sheen: "sheen 4.5s ease-in-out infinite",
        "fade-in": "fadeIn .4s cubic-bezier(.2,.8,.2,1)",
        "slide-up": "slideUp .45s cubic-bezier(.2,.8,.2,1)",
        "scale-in": "scaleIn .3s cubic-bezier(.2,.8,.2,1)",
      },
      keyframes: {
        flow: {
          "0%, 100%": { backgroundPosition: "0% 0%" },
          "50%": { backgroundPosition: "100% 100%" },
        },
        sheen: {
          "0%, 70%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },

      // 🎯 radii — premium soft look
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },

      // 📐 container tuning (Instagram-like feed)
      maxWidth: {
        feed: "600px",
        shell: "1280px",
      },
    },
  },
  plugins: [],
};
