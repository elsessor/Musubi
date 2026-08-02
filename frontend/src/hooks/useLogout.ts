"use client";

import { useRouter } from "next/navigation";

import { logoutFirebase } from "@/firebase/auth";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const showToast = useToastStore((state) => state.showToast);

  return async () => {
    await logoutFirebase();
    logout();
    showToast({
      title: "Signed out",
      description: "Your session has ended.",
      tone: "success"
    });
    router.push("/sign-in");
  };
}
