"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProjectQueryParam } from "@/components/providers/use-project-query-param";

function HomeRedirect() {
  const router = useRouter();
  const project = useProjectQueryParam();

  useEffect(() => {
    const target = project ? `/dashboard?project=${encodeURIComponent(project)}` : "/dashboard";
    router.replace(target);
  }, [project, router]);

  return null;
}

export default function HomePage() {
  return <HomeRedirect />;
}
