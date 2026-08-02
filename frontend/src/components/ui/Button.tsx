import type { ButtonHTMLAttributes, ReactNode } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-soft hover:bg-brand-deep",
  secondary: "bg-white text-slate-700 shadow-input hover:bg-slate-50",
  ghost: "bg-transparent text-brand hover:bg-brand-soft"
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
