import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Thuang Tasks",
  description: "Internal task management for focused team delegation."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
