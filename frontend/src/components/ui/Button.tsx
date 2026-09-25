import type { ButtonHTMLAttributes, ReactNode } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "default" | "destructive" | "link";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  variant?: ButtonVariant;
  size?: string;
  children?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-soft hover:bg-brand-deep",
  secondary: "bg-white text-slate-700 shadow-input hover:bg-slate-50",
  ghost: "bg-transparent text-brand hover:bg-brand-soft",
  outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  default: "bg-brand text-white shadow-soft hover:bg-brand-deep",
  destructive: "bg-rose-600 text-white hover:bg-rose-700",
  link: "text-brand underline-offset-4 hover:underline"
};

export function Button({
  isLoading = false,
  variant = "primary",
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn("auth-button", variants[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <LoadingSpinner className="mr-2" /> : null}
      {children}
    </button>
  );
}

export function buttonVariants(opts?: { variant?: string; size?: string }) {
  const v = opts?.variant || "default";
  if (v === "outline") return "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
  if (v === "ghost") return "bg-transparent text-slate-700 hover:bg-slate-100";
  return "bg-brand text-white shadow-soft hover:bg-brand-deep";
}
