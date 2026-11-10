import { AuthLayout } from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function SignUpPage() {
  return (
    <AuthLayout marketingPosition="left" compactMobile>
      <RegisterForm />
    </AuthLayout>
  );
}
