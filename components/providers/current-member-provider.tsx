"use client";

import * as React from "react";
import type { ProjectMember } from "@/lib/types";
import { useProjectQueryParam } from "@/components/providers/use-project-query-param";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";

type CurrentMemberContextValue = {
  member: ProjectMember | null;
  unreadCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const CurrentMemberContext = React.createContext<CurrentMemberContextValue | null>(null);

export function CurrentMemberProvider({ children }: { children: React.ReactNode }) {
  const projectRoot = useProjectQueryParam();
  const [member, setMember] = React.useState<ProjectMember | null>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const sessionResponse = await fetch(buildProjectScopedPath("/api/auth/session", projectRoot), {
        cache: "no-store",
      });
      const sessionPayload = await sessionResponse.json().catch(() => null);
      const nextMember = sessionResponse.ok && sessionPayload?.success ? sessionPayload.data.member : null;
      setMember(nextMember);

      if (nextMember) {
        const inboxResponse = await fetch(buildProjectScopedPath("/api/inbox", projectRoot), {
          cache: "no-store",
        });
        const inboxPayload = await inboxResponse.json().catch(() => null);
        setUnreadCount(inboxResponse.ok && inboxPayload?.success ? Number(inboxPayload.data.unread || 0) : 0);
      } else {
        setUnreadCount(0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectRoot]);

  const signOut = React.useCallback(async () => {
    await fetch(buildProjectScopedPath("/api/auth/session", projectRoot), {
      method: "DELETE",
    });
    setMember(null);
    setUnreadCount(0);
    window.dispatchEvent(new CustomEvent("lrac:auth-updated"));
  }, [projectRoot]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    const handleAuthUpdated = () => {
      void refresh();
    };
    window.addEventListener("lrac:auth-updated", handleAuthUpdated);
    return () => window.removeEventListener("lrac:auth-updated", handleAuthUpdated);
  }, [refresh]);

  return (
    <CurrentMemberContext.Provider value={{ member, unreadCount, isLoading, refresh, signOut }}>
      {children}
    </CurrentMemberContext.Provider>
  );
}

export function useCurrentMember() {
  const context = React.useContext(CurrentMemberContext);
  if (!context) {
    throw new Error("useCurrentMember must be used within CurrentMemberProvider");
  }
  return context;
}
