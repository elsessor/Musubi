"use client";

import type { ReactNode } from "react";

import { ToastViewport } from "@/components/ui/Toast";
import { useAuthListener } from "@/hooks/useAuthListener";
import { NavigationLoadingProvider } from "@/app/navigationLoading";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  useAuthListener();

  return (
    <>
      <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
      <ToastViewport />
    </>
  );
}
