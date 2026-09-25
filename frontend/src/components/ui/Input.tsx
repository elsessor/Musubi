import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, id, label, required, ...props },
  ref
) {
  return (
    <div>
      {label ? (
        <label className="auth-label" htmlFor={id}>
          {label} {required ? <span className="text-rose-500">*</span> : null}
        </label>
      ) : null}
      <input
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        className={cn("auth-input", error && "border-red-300 focus:border-red-500", className)}
        id={id}
        ref={ref}
        required={required}
        {...props}
      />
      {error ? (
        <p className="auth-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
