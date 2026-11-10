"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { MarketingPanel } from "@/components/auth/MarketingPanel";
import { AuthBrand } from "@/components/auth/AuthBrand";
import { cn } from "@/utils/cn";

type AuthLayoutProps = {
  children: ReactNode;
  marketingPosition?: "left" | "right";
  compactMobile?: boolean;
};

export function AuthLayout({ children, marketingPosition = "right", compactMobile = false }: AuthLayoutProps) {
  const marketingOnLeft = marketingPosition === "left";

  return (
    <motion.main
      animate={{ opacity: 1 }}
      className={cn(
        "min-h-screen bg-page lg:grid",
        marketingOnLeft
          ? "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
          : "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
      )}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <section
        className={cn(
          compactMobile
            ? "order-1 flex min-h-0 min-w-0 items-start justify-center px-5 py-6 sm:min-h-screen sm:items-center sm:px-10 sm:py-14 lg:px-6 xl:px-8"
            : "order-1 flex min-h-screen min-w-0 items-center justify-center px-6 py-14 sm:px-10 lg:px-6 xl:px-8",
          marketingOnLeft && "lg:order-2"
        )}
      >
        <div className="w-full max-w-[440px]">
          {compactMobile ? <AuthBrand /> : null}
          {children}
        </div>
      </section>
      <div className={cn("order-2 min-w-0", compactMobile && "hidden sm:block", marketingOnLeft && "lg:order-1")}>
        <MarketingPanel />
      </div>
    </motion.main>
  );
}
