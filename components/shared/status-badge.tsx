import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "pending" | "in_progress" | "completed" | "blocked" | "active";
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const statusConfig = {
  pending: {
    variant: "secondary" as const,
    dot: "bg-muted-foreground",
  },
  in_progress: {
    variant: "default" as const,
    dot: "bg-primary",
  },
  active: {
    variant: "default" as const,
    dot: "bg-primary animate-pulse",
  },
  completed: {
    variant: "success" as const,
    dot: "bg-success",
  },
  blocked: {
    variant: "error" as const,
    dot: "bg-error",
  },
};

const sizeConfig = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

export function StatusBadge({ status, label, size = "md", className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || status.replace("_", " ");

  return (
    <Badge variant={config.variant} className={cn(sizeConfig[size], className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", config.dot)} />
      {displayLabel}
    </Badge>
  );
}
