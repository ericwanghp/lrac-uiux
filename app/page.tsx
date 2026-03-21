"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function HomeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const project = searchParams.get("project");
    const target = project ? `/dashboard?project=${encodeURIComponent(project)}` : "/dashboard";
    router.replace(target);
  }, [router, searchParams]);

  return null;
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeRedirect />
    </Suspense>
  );
}
