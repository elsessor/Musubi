"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requestPasswordReset } from "@/firebase/auth";
import { useToastStore } from "@/store/toastStore";
import { getFriendlyAuthError } from "@/utils/firebaseErrors";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/utils/validation";

export function ForgotPasswordForm() {
  const showToast = useToastStore((state) => state.showToast);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: ""
    },
    resolver: zodResolver(forgotPasswordSchema)
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      await requestPasswordReset(values.email);
      showToast({
        title: "Reset email sent",
        description: "Please check your inbox for the password reset link.",
        tone: "success"
      });
      reset();
    } catch (error) {
      showToast({
        title: "Unable to send reset email",
        description: getFriendlyAuthError(error),
        tone: "error"
      });
    }
  }

  return (
    <AuthCard>
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-slate-950">Reset password</h2>
        <p className="mt-3 text-base font-medium text-slate-500">
          Enter your email and we will send a secure reset link.
        </p>
      </div>

      <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
        <Input
          autoComplete="email"
          error={errors.email?.message}
          id="email"
          label="Email Address"
          placeholder="you@university.edu.ph"
          type="email"
          {...register("email")}
        />

        <Button isLoading={isSubmitting} type="submit">
          Send Reset Link
        </Button>
      </form>

      <p className="mt-9 text-center text-base font-medium text-slate-400">
        Remember your password?{" "}
        <Link className="auth-link text-lg" href="/sign-in">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
