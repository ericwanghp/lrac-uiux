import { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Palette,
  Building2,
  Code2,
  FlaskConical,
  Rocket,
  Users,
  type LucideIcon,
} from "lucide-react";

type PhaseTheme = {
  icon: LucideIcon;
  accent: string;
  gradientFrom: string;
};

const phaseThemes: Record<string, PhaseTheme> = {
  "1-2": { icon: ClipboardList, accent: "text-blue-500", gradientFrom: "from-blue-500/10" },
  "2.5": { icon: Palette, accent: "text-purple-500", gradientFrom: "from-purple-500/10" },
  "3-4": { icon: Building2, accent: "text-amber-500", gradientFrom: "from-amber-500/10" },
  "5": { icon: Code2, accent: "text-emerald-500", gradientFrom: "from-emerald-500/10" },
  "6": { icon: FlaskConical, accent: "text-cyan-500", gradientFrom: "from-cyan-500/10" },
  "7": { icon: Rocket, accent: "text-rose-500", gradientFrom: "from-rose-500/10" },
  "8": { icon: Users, accent: "text-indigo-500", gradientFrom: "from-indigo-500/10" },
};

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface PhasePageLayoutProps {
  phaseKey: string;
  kicker: string;
  title: string;
  description: string;
  completed: boolean;
  children: ReactNode;
  actions?: ReactNode;
}

export function PhasePageLayout({
  phaseKey,
  kicker,
  title,
  description,
  completed,
  children,
  actions,
}: PhasePageLayoutProps) {
  const theme: PhaseTheme = phaseThemes[phaseKey] ?? phaseThemes["5"]!;
  const PhaseIcon = theme.icon;

  return (
    <div className="admin-page" data-tour="phase-header">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className={`admin-icon-surface h-10 w-10 shrink-0 ${theme.accent}`}>
            <PhaseIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="admin-kicker mb-1">{kicker}</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <Badge variant={completed ? "success" : "secondary"}>
            {completed ? "Completed" : "In Progress"}
          </Badge>
        </div>
      </div>
      {children}
    </div>
  );
}
