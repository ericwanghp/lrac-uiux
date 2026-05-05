"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { TourConfig, TourStep } from "./types";

const STORAGE_PREFIX = "lrac-tour-completed-";

interface TourState {
  activeTourId: string | null;
  currentStepIndex: number;
  isTourActive: boolean;
}

interface TourContextValue extends TourState {
  startTour: (config: TourConfig) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  currentStep: TourStep | null;
  totalSteps: number;
  replayTour: (config: TourConfig) => void;
  isTourCompleted: (tourId: string) => boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within TourProvider");
  }
  return ctx;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TourState>({
    activeTourId: null,
    currentStepIndex: 0,
    isTourActive: false,
  });
  const [steps, setSteps] = useState<TourStep[]>([]);
  const rafRef = useRef<number>(0);

  const currentStep = state.isTourActive ? steps[state.currentStepIndex] ?? null : null;

  const markCompleted = useCallback((tourId: string) => {
    try {
      localStorage.setItem(STORAGE_PREFIX + tourId, "1");
    } catch {}
  }, []);

  const isTourCompleted = useCallback((tourId: string): boolean => {
    try {
      return localStorage.getItem(STORAGE_PREFIX + tourId) === "1";
    } catch {
      return false;
    }
  }, []);

  const scrollToTarget = useCallback((target: string) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = document.querySelector(target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    });
  }, []);

  const startTour = useCallback(
    (config: TourConfig) => {
      if (isTourCompleted(config.tourId)) return;
      setSteps(config.steps);
      setState({
        activeTourId: config.tourId,
        currentStepIndex: 0,
        isTourActive: true,
      });
      if (config.steps[0]) {
        scrollToTarget(config.steps[0].target);
      }
    },
    [isTourCompleted, scrollToTarget],
  );

  const replayTour = useCallback(
    (config: TourConfig) => {
      try {
        localStorage.removeItem(STORAGE_PREFIX + config.tourId);
      } catch {}
      setSteps(config.steps);
      setState({
        activeTourId: config.tourId,
        currentStepIndex: 0,
        isTourActive: true,
      });
      if (config.steps[0]) {
        scrollToTarget(config.steps[0].target);
      }
    },
    [scrollToTarget],
  );

  const nextStep = useCallback(() => {
    setState((prev) => {
      const nextIdx = prev.currentStepIndex + 1;
      if (nextIdx >= steps.length) {
        if (prev.activeTourId) markCompleted(prev.activeTourId);
        return { activeTourId: null, currentStepIndex: 0, isTourActive: false };
      }
      scrollToTarget(steps[nextIdx]?.target ?? "");
      return { ...prev, currentStepIndex: nextIdx };
    });
  }, [steps, markCompleted, scrollToTarget]);

  const prevStep = useCallback(() => {
    setState((prev) => {
      const prevIdx = Math.max(0, prev.currentStepIndex - 1);
      scrollToTarget(steps[prevIdx]?.target ?? "");
      return { ...prev, currentStepIndex: prevIdx };
    });
  }, [steps, scrollToTarget]);

  const skipTour = useCallback(() => {
    setState((prev) => {
      if (prev.activeTourId) markCompleted(prev.activeTourId);
      return { activeTourId: null, currentStepIndex: 0, isTourActive: false };
    });
  }, [markCompleted]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <TourContext.Provider
      value={{
        ...state,
        currentStep,
        totalSteps: steps.length,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        replayTour,
        isTourCompleted,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}
