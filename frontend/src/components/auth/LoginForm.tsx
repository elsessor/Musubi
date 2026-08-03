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
import { loginWithEmail, signInWithGoogle } from "@/firebase/auth";
import { exchangeFirebaseSession } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { getFriendlyAuthError } from "@/utils/firebaseErrors";
import { getPostAuthenticationRoute } from "@/utils/routes";
import { loginSchema, type LoginFormValues } from "@/utils/validation";

export function LoginForm() {
  const router = useRouter();
  const authStore = useAuthStore();
  const showToast = useToastStore((state) => state.showToast);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true
    },
    resolver: zodResolver(loginSchema)
  });

  async function completeLogin(user: Awaited<ReturnType<typeof loginWithEmail>>) {
    const session = await exchangeFirebaseSession(user);
    authStore.setFirebaseUser(user);
    authStore.setProfile(session.user);

    showToast({
      title: "Signed in successfully",
      description: session.user.onboardingCompleted ? "Taking you to your dashboard." : "Let's finish setting up your account.",
      tone: "success"
    });

    router.push(getPostAuthenticationRoute(session.user));
  }

  async function onSubmit(values: LoginFormValues) {
    authStore.setLoading(true);
    try {
      const user = await loginWithEmail(values);
      await completeLogin(user);
    } catch (error) {
      showToast({
        title: "Unable to sign in",
        description: getFriendlyAuthError(error),
        tone: "error"
      });
    } finally {
      authStore.setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    authStore.setLoading(true);
    try {
      const user = await signInWithGoogle();
      await completeLogin(user);
    } catch (error) {
      showToast({
        title: "Google sign-in failed",
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
      <div className="mb-9">
        <h2 className="text-3xl font-extrabold text-slate-950">Welcome back</h2>
        <p className="mt-3 text-base font-medium text-slate-500">
          Sign in - your dashboard is determined by your account role
        </p>
      </div>

      <div className="space-y-8">
        <GoogleButton
          isLoading={googleLoading}
          label="Continue with Google"
          onClick={handleGoogleSignIn}
        />
        <Divider />
      </div>

      <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
        <Input
          autoComplete="email"
          error={errors.email?.message}
          id="email"
          label="Email Address"
          placeholder="you@university.edu.ph"
          type="email"
          {...register("email")}
        />

        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <label className="auth-label mb-0" htmlFor="password">
              Password
            </label>
            <Link className="auth-link text-sm" href="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <PasswordField
            autoComplete="current-password"
            error={errors.password?.message}
            id="password"
            placeholder="Password"
            {...register("password")}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-500">
          <input
            className="size-4 rounded border-slate-300 text-brand focus:ring-accent"
            type="checkbox"
            {...register("rememberMe")}
          />
          Remember me
        </label>

        <Button isLoading={isSubmitting} type="submit" disabled={isBusy}>
          Sign In
        </Button>
      </form>

      <p className="mt-9 text-center text-base font-medium text-slate-400">
        No account yet?{" "}
        <Link className="auth-link text-lg" href="/sign-up">
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}
