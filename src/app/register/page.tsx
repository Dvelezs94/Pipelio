import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-49px)] flex flex-col items-center justify-center px-4 py-12">
      <RegisterForm />
    </div>
  );
}
