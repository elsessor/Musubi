"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Input } from "@/components/ui/Input";
import { registerWithEmail, signInWithGoogle } from "@/firebase/auth";
import { exchangeFirebaseSession } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { getFriendlyAuthError } from "@/utils/firebaseErrors";
import { getDashboardRoute } from "@/utils/routes";
import { registerSchema, type RegisterFormValues } from "@/utils/validation";

export function RegisterForm() {
  const router = useRouter();
  const authStore = useAuthStore();
  const showToast = useToastStore((state) => state.showToast);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch
  } = useForm<RegisterFormValues>({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false
    },
    resolver: zodResolver(registerSchema)
  });
  const termsAccepted = watch("terms");

  async function completeRegistration(user: Awaited<ReturnType<typeof registerWithEmail>>) {
    const session = await exchangeFirebaseSession(user);
    authStore.login(session);
    authStore.setUser(user);

    showToast({
      title: "Account created",
      description: "Your workspace is ready.",
      tone: "success"
    });

    router.push(getDashboardRoute(session.role));
  }

  async function onSubmit(values: RegisterFormValues) {
    authStore.setLoading(true);
    try {
      const user = await registerWithEmail(values);
      await completeRegistration(user);
    } catch (error) {
      showToast({
        title: "Unable to create account",
        description: getFriendlyAuthError(error),
        tone: "error"
      });
    } finally {
      authStore.setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    if (!termsAccepted) {
      showToast({
        title: "Terms required",
        description: "Please accept the terms and conditions before signing up.",
        tone: "error"
      });
      return;
    }

    setGoogleLoading(true);
    authStore.setLoading(true);
    try {
      const user = await signInWithGoogle();
      await completeRegistration(user);
    } catch (error) {
      showToast({
        title: "Google sign-up failed",
        description: getFriendlyAuthError(error),
        tone: "error"
      });
    } finally {
      setGoogleLoading(false);
      authStore.setLoading(false);
    }
  }

  const isBusy = isSubmitting || googleLoading;

  return (
    <AuthCard>
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-slate-950">Create an account</h2>
        <p className="mt-3 text-base font-medium text-slate-500">
          Just your name and email to get started
        </p>
      </div>

      <div className="space-y-8">
        <GoogleButton
          isLoading={googleLoading}
          label="Sign up with Google"
          onClick={handleGoogleSignUp}
        />
        <Divider />
      </div>

      <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
        <Input
          autoComplete="name"
          error={errors.fullName?.message}
          id="fullName"
          label="Full Name"
          placeholder="e.g. Juan Dela Cruz"
          required
          type="text"
          {...register("fullName")}
        />

        <Input
          autoComplete="email"
          error={errors.email?.message}
          id="email"
          label="University Email"
          placeholder="you@university.edu.ph"
          required
          type="email"
          {...register("email")}
        />

        <PasswordField
          autoComplete="new-password"
          error={errors.password?.message}
          id="password"
          label="Password"
          placeholder="Min. 8 characters"
          required
          {...register("password")}
        />

        <PasswordField
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          id="confirmPassword"
          label="Confirm Password"
          placeholder="Repeat password"
          required
          {...register("confirmPassword")}
        />

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm font-medium text-slate-500">
            <input
              className="mt-0.5 size-4 rounded border-slate-300 text-brand focus:ring-accent"
              type="checkbox"
              {...register("terms")}
            />
            <span>
              I agree to the{" "}
              <Link className="auth-link" href="/terms">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link className="auth-link" href="/privacy">
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.terms?.message ? (
            <p className="auth-error" role="alert">
              {errors.terms.message}
            </p>
          ) : null}
        </div>

        <Button isLoading={isSubmitting} type="submit" disabled={isBusy}>
          Create Account
        </Button>
      </form>

      <p className="mt-9 text-center text-base font-medium text-slate-400">
        Already have an account?{" "}
        <Link className="auth-link text-lg" href="/sign-in">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
