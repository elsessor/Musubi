"use client";

import { Button } from "@/components/ui/Button";

type GoogleButtonProps = {
  label: string;
  isLoading?: boolean;
  onClick: () => void;
};

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="mr-3 size-5" viewBox="0 0 24 24">
      <path
        d="M22.6 12.2c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 01-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1a6.5 6.5 0 01-6.1-4.5H2.2v2.8A11 11 0 0012 23z"
        fill="#34A853"
      />
      <path
        d="M5.9 14.1a6.6 6.6 0 010-4.2V7.1H2.2a11 11 0 000 9.8l3.7-2.8z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A10.8 10.8 0 0012 1 11 11 0 002.2 7.1l3.7 2.8A6.5 6.5 0 0112 5.4z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleButton({ label, isLoading = false, onClick }: GoogleButtonProps) {
  return (
    <Button
      aria-label={label}
      className="text-[15px] font-semibold"
      isLoading={isLoading}
      onClick={onClick}
      type="button"
      variant="secondary"
    >
      {isLoading ? null : <GoogleIcon />}
      {label}
    </Button>
  );
}
