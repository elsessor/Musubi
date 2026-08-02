export function getFriendlyAuthError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/invalid-credential": "The email or password you entered is incorrect.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/popup-closed-by-user": "Google sign-in was closed before it finished.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/user-not-found": "No account was found for this email.",
    "auth/weak-password": "Please choose a stronger password.",
    "auth/wrong-password": "The email or password you entered is incorrect."
  };

  if (messages[code]) {
    return messages[code];
  }

  if (error instanceof Error && error.message) {
    if (error.message.toLowerCase().includes("fetch")) {
      return "Unable to reach the authentication server. Please check your connection and try again.";
    }

    return error.message;
  }

  return "Something went wrong. Please try again.";
}
