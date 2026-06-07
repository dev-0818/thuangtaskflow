"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Info, LoaderCircle, Lock, Mail, X } from "lucide-react";
import { requestPasswordReset, signIn, type PasswordResetRequestState, type SignInState } from "@/app/actions";

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

function ResetPasswordButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="bronze-button inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-label-md disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
      {pending ? "Sending..." : "Send Reset Link"}
    </button>
  );
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [state, formAction] = useActionState<PasswordResetRequestState, FormData>(requestPasswordReset, {});

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 p-margin-mobile"
      role="presentation"
    >
      <section
        onClick={(event) => event.stopPropagation()}
        className="glass-panel w-full max-w-md rounded-xl p-6 shadow-glow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="forgot-password-title" className="text-headline-md font-semibold text-on-surface">
              Reset Password
            </h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Enter your account email and we will send a reset link.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            aria-label="Close forgot password"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.error ? (
          <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-label-md font-semibold text-error">
            {state.error}
          </div>
        ) : null}

        {state.success ? (
          <div className="mb-4 rounded-lg border border-green-300/30 bg-green-400/10 px-4 py-3 text-label-md font-semibold text-green-200">
            {state.success}
          </div>
        ) : null}

        <form action={formAction} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-label-sm font-semibold uppercase text-on-surface-variant">Email</span>
            <div className="input-surface flex min-h-[52px] items-center gap-3 px-4 py-3">
              <Mail className="h-4 w-4 text-on-surface-variant" />
              <input
                name="email"
                type="email"
                required
                placeholder="you@company.com"
                className="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/55"
              />
            </div>
          </label>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="secondary-button px-5 py-3 text-label-md">
              Back
            </button>
            <div className="sm:min-w-[180px]">
              <ResetPasswordButton />
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

export function LoginForm({ demoMode }: LoginFormProps) {
  const [state, formAction] = useActionState<SignInState, FormData>(signIn, {});
  const [forgotOpen, setForgotOpen] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center px-margin-mobile py-12">
      <div className="w-full max-w-[440px]">
        <form action={formAction} className="glass-panel rounded-xl p-8 shadow-glow md:p-10">
          <div className="mb-10 text-center">
            <h1 className="text-display-lg font-semibold text-primary">Thuang Tasks</h1>
            <p className="mt-3 text-body-md text-on-surface-variant">Premium Workspace</p>
          </div>

          {state.error ? (
            <div className="mb-6 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-label-md font-semibold text-error">
              {state.error}
            </div>
          ) : null}

          <label className="mb-2 block text-label-md font-semibold text-on-surface">Email</label>
          <div className="mb-6 flex items-center gap-3 border-b border-secondary/20 bg-surface-container-high/60 px-4 py-4 transition-colors focus-within:border-primary">
            <Mail className="h-5 w-5 text-on-surface-variant" />
            <input
              name="email"
              type="email"
              defaultValue={demoMode ? "manager@demo.local" : ""}
              placeholder="Enter your email"
              className="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/55"
            />
          </div>

          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-label-md font-semibold text-on-surface">Password</label>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="rounded px-1 py-1 text-label-sm font-semibold text-primary hover:text-primary-fixed-dim"
            >
              Forgot Password?
            </button>
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
      {forgotOpen ? <ForgotPasswordModal onClose={() => setForgotOpen(false)} /> : null}
    </main>
  );
}
