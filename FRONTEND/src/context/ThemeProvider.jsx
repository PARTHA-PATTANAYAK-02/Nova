import { useEffect, useState } from "react";
import { ThemeContext } from "./theme-context";
import {
  THEME_SHADES_DARK,
  THEME_SHADES_LIGHT,
  THEME_ACCENTS,
  THEME_ACCENTS_GRADIENT,
  THEME_ACCENTS_SOLID,
} from "./theme-constants";

export {
  THEME_SHADES_DARK,
  THEME_SHADES_LIGHT,
  THEME_ACCENTS,
  THEME_ACCENTS_GRADIENT,
  THEME_ACCENTS_SOLID,
};

const STORAGE_THEME = "nova-theme";
const STORAGE_DARK_SHADE = "nova-dark-shade";
const STORAGE_LIGHT_SHADE = "nova-light-shade";
const STORAGE_ACCENT = "nova-accent";

const getInitialTheme = () => {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_THEME);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const getInitialDarkShade = () => {
  if (typeof window === "undefined") return "midnight";
  const stored = localStorage.getItem(STORAGE_DARK_SHADE);
  if (THEME_SHADES_DARK.some((s) => s.id === stored)) return stored;
  return "midnight";
};

const getInitialLightShade = () => {
  if (typeof window === "undefined") return "lavender";
  const stored = localStorage.getItem(STORAGE_LIGHT_SHADE);
  if (THEME_SHADES_LIGHT.some((s) => s.id === stored)) return stored;
  return "lavender";
};

const getInitialAccent = () => {
  if (typeof window === "undefined") return "violet";
  const stored = localStorage.getItem(STORAGE_ACCENT);
  if (THEME_ACCENTS.some((a) => a.id === stored)) return stored;
  return "violet";
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);
  const [darkShade, setDarkShade] = useState(getInitialDarkShade);
  const [lightShade, setLightShade] = useState(getInitialLightShade);
  const [accent, setAccent] = useState(getInitialAccent);

  const dark = theme === "dark";
  const activeShade = dark ? darkShade : lightShade;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = theme;
    root.setAttribute("data-theme-shade", activeShade);
    root.setAttribute("data-theme-accent", accent);

    localStorage.setItem(STORAGE_THEME, theme);
    localStorage.setItem(STORAGE_DARK_SHADE, darkShade);
    localStorage.setItem(STORAGE_LIGHT_SHADE, lightShade);
    localStorage.setItem(STORAGE_ACCENT, accent);
  }, [theme, dark, activeShade, darkShade, lightShade, accent]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider
      value={{
        theme,
        dark,
        setTheme,
        toggleTheme,
        darkShade,
        setDarkShade,
        lightShade,
        setLightShade,
        activeShade,
        accent,
        setAccent,
        shadesDark: THEME_SHADES_DARK,
        shadesLight: THEME_SHADES_LIGHT,
        accents: THEME_ACCENTS,
        accentsGradient: THEME_ACCENTS_GRADIENT,
        accentsSolid: THEME_ACCENTS_SOLID,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
