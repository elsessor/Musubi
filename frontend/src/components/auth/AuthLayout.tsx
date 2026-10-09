"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { MarketingPanel } from "@/components/auth/MarketingPanel";
import { cn } from "@/utils/cn";

type AuthLayoutProps = {
  children: ReactNode;
  marketingPosition?: "left" | "right";
};

export function AuthLayout({ children, marketingPosition = "right" }: AuthLayoutProps) {
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
          "order-1 flex min-h-screen min-w-0 items-center justify-center px-6 py-14 sm:px-10 lg:px-6 xl:px-8",
          marketingOnLeft && "lg:order-2"
        )}
      >
        <div className="w-full max-w-[440px]">{children}</div>
      </section>
      <div className={cn("order-2 min-w-0", marketingOnLeft && "lg:order-1")}>
        <MarketingPanel />
      </div>
    </motion.main>
  );
}
