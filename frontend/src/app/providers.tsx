"use client";

import type { ReactNode } from "react";

import { ToastViewport } from "@/components/ui/Toast";
import { useAuthListener } from "@/hooks/useAuthListener";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  useAuthListener();

  return (
    <>
      {children}
      <ToastViewport />
    </>
  );
}
