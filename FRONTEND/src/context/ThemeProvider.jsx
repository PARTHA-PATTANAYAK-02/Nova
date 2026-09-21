import { useEffect, useState } from "react";
import { ThemeContext } from "./theme-context";

/**
 * Nova is a dark-first experience.
 * The aurora background, glass surfaces and neon gradients are all
 * designed for dark. Light mode will be added later as a separate pass.
 *
 * For now we force dark on <html> so Tailwind `dark:` utilities work.
 */
const getInitialTheme = () => {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("theme");
  // Only switch to light if the user explicitly chose it before.
  return stored === "light" ? "light" : "dark";
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);
  const dark = theme === "dark";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    localStorage.setItem("theme", theme);
  }, [theme, dark]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, dark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
