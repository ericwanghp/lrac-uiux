import type { ReactNode } from "react";
import { ConditionalShell } from "@/components/layout/conditional-shell";
import { ToastProvider } from "@/components/shared/toast";
import { ErrorBoundary } from "@/components/shared/error-boundary";
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
        <ToastProvider>
          <ErrorBoundary>
            <ConditionalShell>{children}</ConditionalShell>
          </ErrorBoundary>
        </ToastProvider>
      </body>
    </html>
  );
}
