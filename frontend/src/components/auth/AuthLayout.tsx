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
      className="min-h-screen bg-page lg:grid lg:grid-cols-2"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <section
        className={cn(
          "order-1 flex min-h-screen items-center justify-center px-6 py-14 sm:px-10 lg:min-h-screen",
          marketingOnLeft && "lg:order-2"
        )}
      >
        <div className="w-full max-w-[440px]">{children}</div>
      </section>
      <div className={cn("order-2", marketingOnLeft && "lg:order-1")}>
        <MarketingPanel />
      </div>
    </motion.main>
  );
}
