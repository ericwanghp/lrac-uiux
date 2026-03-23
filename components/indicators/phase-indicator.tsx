"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  FileText,
  Palette,
  Building2,
  BarChart3,
  Code2,
  FlaskConical,
  Rocket,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const phases = [
  { number: 1, name: "Requirements", icon: ClipboardList, route: "/phase/1" },
  { number: 2, name: "Product", icon: FileText, route: "/phase/2" },
  { number: 2.5, name: "Design", icon: Palette, route: "/phase/2.5" },
  { number: 3, name: "Architecture", icon: Building2, route: "/phase/3" },
  { number: 4, name: "Breakdown", icon: BarChart3, route: "/phase/4" },
  { number: 5, name: "Development", icon: Code2, route: "/phase/5" },
  { number: 6, name: "Testing", icon: FlaskConical, route: "/phase/6" },
  { number: 7, name: "Deployment", icon: Rocket, route: "/phase/7" },
  { number: 8, name: "PM", icon: Users, route: "/phase/8" },
];

type PhaseStatus = "completed" | "active" | "pending";

interface PhaseIndicatorProps {
  currentPhase?: number;
  completedPhases?: number[];
  className?: string;
  onPhaseClick?: (phaseNumber: number) => void;
  includePMPhase?: boolean;
  minVisiblePhase?: number;
}

export function PhaseIndicator({
  currentPhase = 5,
  completedPhases = [1, 2, 2.5, 3, 4],
  className,
  onPhaseClick,
  includePMPhase = true,
  minVisiblePhase = 1,
}: PhaseIndicatorProps) {
  const router = useRouter();
  const visiblePhases = (
    includePMPhase ? phases : phases.filter((phase) => phase.number !== 8)
  ).filter((phase) => phase.number >= minVisiblePhase);
  const visiblePhaseNumbers = new Set(visiblePhases.map((phase) => phase.number));
  const effectiveCurrentPhase = includePMPhase || currentPhase !== 8 ? currentPhase : 7;

  const getPhaseStatus = (phaseNumber: number): PhaseStatus => {
    if (completedPhases.includes(phaseNumber) && visiblePhaseNumbers.has(phaseNumber))
      return "completed";
    if (phaseNumber === effectiveCurrentPhase) return "active";
    return "pending";
  };

  const handlePhaseClick = (phaseNumber: number, route: string) => {
    if (onPhaseClick) {
      onPhaseClick(phaseNumber);
    } else {
      router.push(route);
    }
  };

  const completedCount = visiblePhases.filter((phase) =>
    completedPhases.includes(phase.number)
  ).length;
  const totalPhases = visiblePhases.length;
  const progressPercentage = (completedCount / totalPhases) * 100;

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Overall Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-secondary-foreground">Overall Progress</span>
          <span className="text-sm text-muted-foreground">
            {completedCount} of {totalPhases} phases complete
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="gradient-progress h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Phase Circles */}
      <div className="relative">
        {/* Mobile/Tablet View */}
        <div className="grid grid-cols-3 gap-4 md:hidden">
          {visiblePhases.map((phase) => {
            const status = getPhaseStatus(phase.number);
            const Icon = phase.icon;
            return (
              <button
                key={phase.number}
                type="button"
                onClick={() => handlePhaseClick(phase.number, phase.route)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "hover:scale-105 hover:bg-accent/10",
                  status === "active" && "bg-primary/10"
                )}
                disabled={status === "pending"}
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-bold transition-all",
                    status === "completed" && "border-success bg-success text-white",
                    status === "active" &&
                      "border-primary bg-primary text-white shadow-lg shadow-primary/50",
                    status === "pending" &&
                      "border-border bg-secondary text-muted-foreground opacity-50"
                  )}
                >
                  {status === "completed" ? "✓" : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={cn(
                    "text-center text-xs",
                    status === "active" && "font-semibold text-primary",
                    status === "completed" && "text-success",
                    status === "pending" && "text-muted-foreground"
                  )}
                >
                  {phase.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Desktop View */}
        <div className="hidden md:flex items-center justify-between">
          {visiblePhases.map((phase, index) => {
            const status = getPhaseStatus(phase.number);
            const nextPhase = visiblePhases[index + 1];
            const nextStatus = nextPhase ? getPhaseStatus(nextPhase.number) : null;
            const Icon = phase.icon;

            return (
              <React.Fragment key={phase.number}>
                {/* Phase Circle */}
                <button
                  type="button"
                  onClick={() => handlePhaseClick(phase.number, phase.route)}
                  className={cn(
                    "group flex flex-col items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md",
                    "hover:scale-110",
                    status === "pending" && "cursor-not-allowed opacity-50"
                  )}
                  disabled={status === "pending"}
                >
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full border-2 text-base font-bold transition-all",
                      "group-hover:shadow-lg",
                      status === "completed" &&
                        "border-success bg-success text-white group-hover:shadow-success/50",
                      status === "active" &&
                        "border-primary bg-primary text-white shadow-lg shadow-primary/50 group-hover:shadow-xl",
                      status === "pending" && "border-border bg-secondary text-muted-foreground"
                    )}
                  >
                    {status === "completed" ? "✓" : <Icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={cn(
                      "text-center text-xs font-medium transition-colors",
                      status === "active" && "font-semibold text-primary",
                      status === "completed" && "text-success",
                      status === "pending" && "text-muted-foreground"
                    )}
                  >
                    {phase.name}
                  </span>
                </button>

                {/* Connector Line */}
                {index < visiblePhases.length - 1 && (
                  <div className="relative mx-2 h-0.5 flex-1 bg-border">
                    <div
                      className={cn(
                        "h-full transition-all duration-500",
                        nextStatus === "completed" || nextStatus === "active"
                          ? "bg-gradient-to-r from-success to-primary"
                          : "bg-transparent"
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Current Phase Badge */}
      <div className="flex items-center justify-center gap-2">
        <Badge variant="default" className="text-sm px-4 py-2">
          Phase {effectiveCurrentPhase}:{" "}
          {visiblePhases.find((p) => p.number === effectiveCurrentPhase)?.name ?? "Unknown"}
        </Badge>
      </div>
    </div>
  );
}
