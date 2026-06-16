import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-49px)] flex flex-col items-center justify-center px-4 py-12 gap-6">
      <Logo size="lg" href="/login" />
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
