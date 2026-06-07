import { ShieldAlert } from "lucide-react";

export default function SetupBlockedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-margin-mobile">
      <section className="glass-panel max-w-lg rounded-xl p-8 text-center">
        <ShieldAlert className="mx-auto mb-5 h-10 w-10 text-primary" />
        <h1 className="text-headline-md text-on-surface">Profile setup required</h1>
        <p className="mt-3 text-body-md text-on-surface-variant">
          Your authenticated account does not have a Thuang Tasks profile yet. Ask a manager to complete your user record.
        </p>
      </section>
    </main>
  );
}
