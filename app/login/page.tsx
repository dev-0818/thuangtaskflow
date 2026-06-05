import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  const demoMode = !isSupabaseConfigured();
  return <LoginForm demoMode={demoMode} />;
}
