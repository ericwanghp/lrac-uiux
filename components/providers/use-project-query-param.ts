"use client";

import * as React from "react";
import { normalizeGlobalProjectRoot } from "@/lib/utils/project-selection";

const PROJECT_LOCATION_EVENT = "lrac:location-changed";

type HistoryWithProjectHook = History & {
  __lracProjectHookInstalled?: boolean;
  __lracProjectLocationEventScheduled?: boolean;
};

function readProjectFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeGlobalProjectRoot(new URLSearchParams(window.location.search).get("project"));
}

function installHistoryListeners() {
  if (typeof window === "undefined") {
    return;
  }

  const historyWithFlag = window.history as HistoryWithProjectHook;

  if (historyWithFlag.__lracProjectHookInstalled) {
    return;
  }

  const scheduleLocationChangeEvent = () => {
    if (historyWithFlag.__lracProjectLocationEventScheduled) {
      return;
    }

    historyWithFlag.__lracProjectLocationEventScheduled = true;

    queueMicrotask(() => {
      historyWithFlag.__lracProjectLocationEventScheduled = false;
      window.dispatchEvent(new Event(PROJECT_LOCATION_EVENT));
    });
  };

  const wrap = (method: "pushState" | "replaceState") => {
    const original = window.history[method];

    window.history[method] = function patchedHistoryMethod(
      this: History,
      ...args: Parameters<History["pushState"]>
    ) {
      const result = original.apply(this, args);
      scheduleLocationChangeEvent();
      return result;
    };
  };

  wrap("pushState");
  wrap("replaceState");
  historyWithFlag.__lracProjectHookInstalled = true;
}

function subscribeToProjectLocation(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  installHistoryListeners();

  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(PROJECT_LOCATION_EVENT, onStoreChange);
  window.addEventListener("lrac:project-changed", onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(PROJECT_LOCATION_EVENT, onStoreChange);
    window.removeEventListener("lrac:project-changed", onStoreChange);
  };
}

export function useProjectQueryParam(): string | null {
  return React.useSyncExternalStore(
    subscribeToProjectLocation,
    readProjectFromLocation,
    () => null
  );
}
