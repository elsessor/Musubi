"use client";

import { motion, AnimatePresence } from "framer-motion";

import { useToastStore, type ToastTone } from "@/store/toastStore";
import { cn } from "@/utils/cn";

const toneClasses: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-blue-200 bg-blue-50 text-blue-900"
};

export function ToastViewport() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div
      aria-live="polite"
      className="fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn("rounded-card border p-4 shadow-soft", toneClasses[toast.tone])}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-sm opacity-80">{toast.description}</p>
                ) : null}
              </div>
              <button
                aria-label="Dismiss notification"
                className="rounded-md px-1 text-lg leading-none opacity-60 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                onClick={() => dismissToast(toast.id)}
                type="button"
              >
                x
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
