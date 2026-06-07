"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, KeyRound, LoaderCircle, Lock } from "lucide-react";
import { createSupabaseBrowserClient, type EmailOtpType } from "@/lib/supabase/browser";

type ResetStatus = "checking" | "ready" | "submitting" | "complete" | "error";

function cleanResetUrl() {
  window.history.replaceState(null, "", "/reset-password");
}

export function ResetPasswordForm() {
  const [status, setStatus] = useState<ResetStatus>("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function prepareSession() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setMessage("Reset password hanya tersedia saat Supabase aktif.");
        setStatus("error");
        return;
      }

      const url = new URL(window.location.href);
      const resetError = url.searchParams.get("reset_error");
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type") as EmailOtpType | null;
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      try {
        if (resetError) {
          throw new Error("Reset link could not be verified.");
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          cleanResetUrl();
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
          cleanResetUrl();
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) throw error;
          cleanResetUrl();
        }

        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session) {
          setMessage("Link reset password belum valid atau sudah kedaluwarsa.");
          setStatus("error");
          return;
        }

        setStatus("ready");
      } catch {
        if (!mounted) return;
        setMessage("Link reset password belum valid atau sudah kedaluwarsa.");
        setStatus("error");
      }
    }

    void prepareSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Reset password hanya tersedia saat Supabase aktif.");
      setStatus("error");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    if (password.length < 8) {
      setMessage("Password minimal 8 karakter.");
      setStatus("ready");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Konfirmasi password tidak sama.");
      setStatus("ready");
      return;
    }

    setStatus("submitting");
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message || "Password gagal diperbarui.");
      setStatus("ready");
      return;
    }

    await supabase.auth.signOut();
    setMessage("Password berhasil diperbarui. Silakan login ulang.");
    setStatus("complete");
  }

  const busy = status === "checking" || status === "submitting";
  const complete = status === "complete";
  const error = status === "error";

  return (
    <main className="flex min-h-screen items-center justify-center px-margin-mobile py-12">
      <div className="w-full max-w-[440px]">
        <form onSubmit={handleSubmit} className="glass-panel rounded-xl p-8 shadow-glow md:p-10">
          <div className="mb-10 text-center">
            <h1 className="text-display-lg font-semibold text-primary">Thuang Tasks</h1>
            <p className="mt-3 text-body-md text-on-surface-variant">Reset Password</p>
          </div>

          {status === "checking" ? (
            <div className="mb-6 rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-label-md font-semibold text-primary">
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Verifying reset link...
              </span>
            </div>
          ) : null}

          {message ? (
            <div className={`mb-6 rounded-lg border px-4 py-3 text-label-md font-semibold ${complete ? "border-green-300/30 bg-green-400/10 text-green-200" : "border-error/30 bg-error/10 text-error"}`}>
              <span className="inline-flex items-center gap-2">
                {complete ? <CheckCircle2 className="h-4 w-4" /> : null}
                {message}
              </span>
            </div>
          ) : null}

          <label className="mb-2 block text-label-md font-semibold text-on-surface">New Password</label>
          <div className="mb-6 flex items-center gap-3 border-b border-secondary/20 bg-surface-container-high/60 px-4 py-4 transition-colors focus-within:border-primary">
            <Lock className="h-5 w-5 text-on-surface-variant" />
            <input
              name="password"
              type="password"
              minLength={8}
              required
              disabled={busy || complete || error}
              placeholder="Min. 8 characters"
              className="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/55 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <label className="mb-2 block text-label-md font-semibold text-on-surface">Confirm Password</label>
          <div className="mb-8 flex items-center gap-3 border-b border-secondary/20 bg-surface-container-high/60 px-4 py-4 transition-colors focus-within:border-primary">
            <Lock className="h-5 w-5 text-on-surface-variant" />
            <input
              name="confirm_password"
              type="password"
              minLength={8}
              required
              disabled={busy || complete || error}
              placeholder="Repeat new password"
              className="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/55 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {complete || error ? (
            <Link href="/login" className="bronze-button flex w-full items-center justify-center gap-3 px-6 py-4 text-body-md">
              Back to Login
              <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <button
              disabled={busy}
              className="bronze-button flex w-full items-center justify-center gap-3 px-6 py-4 text-body-md disabled:cursor-wait disabled:opacity-70"
            >
              {status === "submitting" ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
              {status === "submitting" ? "Updating..." : "Update Password"}
            </button>
          )}
        </form>
      </div>
    </main>
  );
}
