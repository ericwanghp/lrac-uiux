"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TourProvider, useTour } from "@/components/tour/tour-provider";
import { TourOverlay } from "@/components/tour/tour-overlay";
import { getTourForPath } from "@/components/tour/tour-configs";

function TourAutoStart({ pathname }: { pathname: string }) {
  const { startTour, isTourActive } = useTour();
  const lastPathRef = useRef(pathname);

  useEffect(() => {
    if (pathname === "/" || pathname.startsWith("/api/")) return;
    if (lastPathRef.current === pathname && isTourActive) return;
    lastPathRef.current = pathname;

    const config = getTourForPath(pathname);
    if (!config) return;

    const timer = setTimeout(() => {
      startTour(config);
    }, 800);

    return () => clearTimeout(timer);
  }, [pathname, startTour, isTourActive]);

  return null;
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <>
      {!isLanding && <TourAutoStart pathname={pathname} />}
      <TourOverlay />
      {isLanding ? <>{children}</> : <AppShell>{children}</AppShell>}
    </>
  );
}

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  return (
    <TourProvider>
      <ShellInner>{children}</ShellInner>
    </TourProvider>
  );
}
