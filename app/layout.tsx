import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import "@xterm/xterm/css/xterm.css";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
