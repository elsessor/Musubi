"use client";

import type { InputHTMLAttributes } from "react";
import { forwardRef, useState } from "react";

import { cn } from "@/utils/cn";

type PasswordFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label?: string;
};

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d={
          hidden
            ? "M4 4l16 16M10.7 10.7A2 2 0 0012 14a2 2 0 001.3-.5M9.9 5.2A9.7 9.7 0 0112 5c5 0 8.5 4 9.5 7a10.6 10.6 0 01-2.2 3.5M6.6 6.9A10.8 10.8 0 002.5 12c.9 3 4.5 7 9.5 7 1.5 0 2.8-.3 4-.9"
            : "M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7zM12 15a3 3 0 100-6 3 3 0 000 6z"
        }
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ className, error, id, label, required, ...props }, ref) {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div>
        {label ? (
          <label className="auth-label" htmlFor={id}>
            {label} {required ? <span className="text-rose-500">*</span> : null}
          </label>
        ) : null}
        <div className="relative">
          <input
            aria-describedby={error ? `${id}-error` : undefined}
            aria-invalid={Boolean(error)}
            className={cn(
              "auth-input pr-12",
              error && "border-red-300 focus:border-red-500",
              className
            )}
            id={id}
            ref={ref}
            required={required}
            type={isVisible ? "text" : "password"}
            {...props}
          />
          <button
            aria-label={isVisible ? "Hide password" : "Show password"}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md text-slate-400 transition hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => setIsVisible((value) => !value)}
            type="button"
          >
            <EyeIcon hidden={isVisible} />
          </button>
        </div>
        {error ? (
          <p className="auth-error" id={`${id}-error`} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
