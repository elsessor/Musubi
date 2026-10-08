"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type NavigationLoadingContextValue = { navigating: boolean; startNavigation: () => void };
const NavigationLoadingContext = createContext<NavigationLoadingContextValue | null>(null);

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => setNavigating(false), [pathname]);

  const value = useMemo(() => ({ navigating, startNavigation: () => setNavigating(true) }), [navigating]);
  return <NavigationLoadingContext.Provider value={value}>{children}</NavigationLoadingContext.Provider>;
}

export function useNavigationLoading() {
  const context = useContext(NavigationLoadingContext);
  if (!context) throw new Error("useNavigationLoading must be used within NavigationLoadingProvider");
  return context;
}
