"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { DarkModeSwitch } from "react-toggle-dark-mode";

const buttonClass = "inline-flex size-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => setMounted(true), []);

  const dark = resolvedTheme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";

  return <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50">
    {!mounted ? <span aria-hidden="true" className={buttonClass}><Sun className="size-[22px] text-slate-600 dark:hidden" /><Moon className="hidden size-[22px] text-slate-200 dark:block" /></span>
      : reducedMotion ? <button type="button" role="switch" aria-checked={dark} aria-label={label} title={label} data-theme-toggle className={buttonClass} onClick={() => setTheme(dark ? "light" : "dark")}>
        {dark ? <Moon aria-hidden="true" className="size-[22px] text-slate-200" /> : <Sun aria-hidden="true" className="size-[22px] text-slate-600" />}
      </button>
      : <DarkModeSwitch checked={dark} onChange={(checked) => setTheme(checked ? "dark" : "light")} size={22} moonColor="#e2e8f0" sunColor="#475569" aria-label={label} title={label} data-theme-toggle className={buttonClass} style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }} />}
  </div>;
}
