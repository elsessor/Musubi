import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export default function SignInPage() {
  return (
    <AuthLayout marketingPosition="right">
      <LoginForm />
    </AuthLayout>
  );
}
