"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type AuthCardProps = {
  children: ReactNode;
  className?: string;
};

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <motion.section
      animate={{ opacity: 1, x: 0 }}
      className={className}
      initial={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.42, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}
