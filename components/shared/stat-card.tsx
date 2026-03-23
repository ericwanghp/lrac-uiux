import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "primary" | "success" | "warning" | "error";
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const variantStyles = {
    default: "border-border/80 bg-card/88",
    primary: "border-primary/35 bg-primary/10",
    success: "border-success/35 bg-success/10",
    warning: "border-warning/35 bg-warning/10",
    error: "border-error/35 bg-error/10",
  };

  const valueStyles = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
  };

  return (
    <Card
      className={cn(
        "admin-panel min-h-[148px] border backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5",
        variantStyles[variant],
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {title}
            </p>
            <p
              className={cn(
                "mt-2 text-4xl font-bold leading-none tracking-tight",
                valueStyles[variant]
              )}
            >
              {value}
            </p>
            {description && <p className="mt-2 text-xs text-muted-foreground">{description}</p>}
            {trend && (
              <div className="mt-3 flex items-center gap-1">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    trend.value >= 0 ? "text-success" : "text-error"
                  )}
                >
                  {trend.value >= 0 ? "+" : ""}
                  {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="admin-icon-surface h-11 w-11 rounded-2xl">
              <div className={cn("h-5 w-5", valueStyles[variant])}>{icon}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
