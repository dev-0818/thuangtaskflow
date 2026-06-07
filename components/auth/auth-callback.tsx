"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { createSupabaseBrowserClient, type EmailOtpType } from "@/lib/supabase/browser";

function cleanNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) return "/reset-password";
  return value;
}

function redirectToResetError() {
  window.location.replace("/reset-password?reset_error=1");
}

export function AuthCallback() {
  const [message, setMessage] = useState("Preparing your reset link...");

  useEffect(() => {
    let mounted = true;

    async function handleCallback() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        redirectToResetError();
        return;
      }

      const url = new URL(window.location.href);
      const next = cleanNextPath(url.searchParams.get("next"));
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type") as EmailOtpType | null;
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      try {
        if (mounted) setMessage("Verifying reset link...");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) throw error;
        } else {
          throw new Error("Missing reset token.");
        }

        window.location.replace(next);
      } catch {
        redirectToResetError();
      }
    }

    void handleCallback();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-margin-mobile py-12">
      <section className="glass-panel flex w-full max-w-md items-center gap-3 rounded-xl p-6 shadow-glow">
        <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
        <p className="text-body-md font-semibold text-on-surface">{message}</p>
      </section>
    </main>
  );
}
