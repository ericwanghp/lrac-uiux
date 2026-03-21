import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  title: string;
  description: string;
  status: "active" | "pending" | "completed" | "blocked";
  progress: number;
  phase: string;
  tasksCompleted: number;
  tasksTotal: number;
  className?: string;
}

export function ProjectCard({
  title,
  description,
  status,
  progress,
  phase,
  tasksCompleted,
  tasksTotal,
  className,
}: ProjectCardProps) {
  return (
    <Card className={cn("hover:border-primary transition-colors", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Badge
            variant={
              status === "completed"
                ? "success"
                : status === "active"
                  ? "default"
                  : status === "blocked"
                    ? "error"
                    : "secondary"
            }
          >
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full gradient-progress transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{phase}</Badge>
            <span className="text-muted-foreground">
              {tasksCompleted}/{tasksTotal} tasks
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
