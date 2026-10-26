import { SunIcon, MoonIcon } from "@animateicons/react/lucide";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import { useState, useRef } from "react";
import { useTheme } from "@/hooks/useTheme";

const ThemeToggle = ({ size = "md", className = "" }) => {
  const { dark, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);
  const btnRef = useRef(null);

  const sizeMap = {
    sm: { box: "w-8 h-8", icon: 14 },
    md: { box: "w-9 h-9", icon: 16 },
    lg: { box: "w-11 h-11", icon: 20 },
  };
  const s = sizeMap[size] || sizeMap.md;

  const handleToggle = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 900);

    if (!document.startViewTransition) {
      toggleTheme();
      return;
    }

    const transition = document.startViewTransition(() => {
      toggleTheme();
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: ["inset(0 0 0 0)", "inset(0 0 0 100%)"] },
        {
          duration: 900,
          easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          pseudoElement: "::view-transition-old(root)",
        },
      );
    });
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleToggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`
        relative ${s.box} rounded-full flex items-center justify-center
        bg-[var(--surface-2)] hover:bg-[var(--surface-3)]
        text-[var(--foreground)]
        transition-all duration-300
        hover:-translate-y-[1px] active:scale-[.94]
        outline-none focus:outline-none focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-[var(--primary)]/45
        focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] cursor-pointer group
        ${isAnimating ? "animate-theme-btn" : ""}
        ${className}
      `}
    >
      {isAnimating && (
        <span
          className="theme-ring absolute inset-0 rounded-full pointer-events-none"
          style={{ background: "var(--primary)" }}
        />
      )}

      <span
        className={`relative flex items-center justify-center ${
          isAnimating ? "theme-icon-spin" : ""
        }`}
      >
        {dark ? (
          <AnimatedIcon icon={SunIcon} size={s.icon} />
        ) : (
          <AnimatedIcon icon={MoonIcon} size={s.icon} />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;