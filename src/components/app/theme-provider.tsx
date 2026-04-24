"use client";

import * as React from "react";

type Theme = "light" | "dark";
type ThemeCtx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const Ctx = React.createContext<ThemeCtx | null>(null);
const STORAGE_KEY = "scheduler-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("dark");

  React.useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "dark";
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    applyTheme(t);
  }, []);

  const toggle = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>
  );
}

export function useTheme() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside <ThemeProvider>");
  return v;
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", t === "dark");
  root.style.colorScheme = t;
}

/** Inline script injected before hydration to prevent FOUC. */
export const themeInitScript = `
(function(){try{
  var t = localStorage.getItem('${STORAGE_KEY}');
  if (!t) t = 'dark';
  var r = document.documentElement;
  if (t === 'dark') r.classList.add('dark');
  r.style.colorScheme = t;
}catch(e){
  document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme = 'dark';
}})();
`;
