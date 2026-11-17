"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

import { ToastViewport } from "@/components/ui/Toast";
import { useAuthListener } from "@/hooks/useAuthListener";
import { NavigationLoadingProvider } from "@/app/navigationLoading";
import { TutorialProvider } from "@/components/onboarding/TutorialProvider";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  useAuthListener();

  return (
    <ThemeProvider attribute="class" storageKey="musubi-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
      <NavigationLoadingProvider><TutorialProvider>{children}</TutorialProvider></NavigationLoadingProvider>
      <ToastViewport />
    </ThemeProvider>
  );
}
