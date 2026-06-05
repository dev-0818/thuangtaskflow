"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Info, Lock, User } from "lucide-react";
import { signIn, type SignInState } from "@/app/actions";

type LoginFormProps = {
  demoMode: boolean;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="bronze-button flex w-full items-center justify-center gap-3 px-6 py-4 text-body-md disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Signing In..." : "Sign In"}
      <ArrowRight className="h-5 w-5" />
    </button>
  );
}

export function LoginForm({ demoMode }: LoginFormProps) {
  const [state, formAction] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <main className="flex min-h-screen items-center justify-center px-margin-mobile py-12">
      <div className="w-full max-w-[440px]">
        <form action={formAction} className="glass-panel rounded-xl p-8 shadow-glow md:p-10">
          <div className="mb-10 text-center">
            <h1 className="text-display-lg font-semibold text-primary">TaskFlow</h1>
            <p className="mt-3 text-body-md text-on-surface-variant">Premium Workspace</p>
          </div>

          {state.error ? (
            <div className="mb-6 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-label-md font-semibold text-error">
              {state.error}
            </div>
          ) : null}

          <label className="mb-2 block text-label-md font-semibold text-on-surface">Username</label>
          <div className="mb-6 flex items-center gap-3 border-b border-secondary/20 bg-surface-container-high/60 px-4 py-4 transition-colors focus-within:border-primary">
            <User className="h-5 w-5 text-on-surface-variant" />
            <input
              name="email"
              type="text"
              defaultValue={demoMode ? "manager" : ""}
              placeholder="Enter your username"
              className="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/55"
            />
          </div>

          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-label-md font-semibold text-on-surface">Password</label>
            <span className="text-label-sm text-primary">Forgot Password?</span>
          </div>
          <div className="mb-8 flex items-center gap-3 border-b border-secondary/20 bg-surface-container-high/60 px-4 py-4 transition-colors focus-within:border-primary">
            <Lock className="h-5 w-5 text-on-surface-variant" />
            <input
              name="password"
              type="password"
              defaultValue={demoMode ? "taskflow" : ""}
              placeholder="Password"
              className="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/55"
            />
          </div>

          <SubmitButton />
        </form>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-body-md text-on-surface-variant/80">
          <Info className="h-4 w-4" />
          Account creation is managed by administrators.
        </p>
      </div>
    </main>
  );
}
