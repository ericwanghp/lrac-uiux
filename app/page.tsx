"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ClipboardList,
  Palette,
  Building2,
  Code2,
  FlaskConical,
  Rocket,
  Bot,
  Layers,
  GitBranch,
  Sparkles,
  CheckCircle2,
  TerminalSquare,
  Workflow,
} from "lucide-react";

const phases = [
  { icon: ClipboardList, label: "Requirements", desc: "BRD & PRD", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 border-blue-200/60 dark:bg-blue-950/50 dark:border-blue-800/40", iconBg: "bg-blue-100 dark:bg-blue-900/60" },
  { icon: Palette, label: "UI/UX Design", desc: "Stitch AI", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 border-purple-200/60 dark:bg-purple-950/50 dark:border-purple-800/40", iconBg: "bg-purple-100 dark:bg-purple-900/60" },
  { icon: Building2, label: "Architecture", desc: "System Design", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 border-amber-200/60 dark:bg-amber-950/50 dark:border-amber-800/40", iconBg: "bg-amber-100 dark:bg-amber-900/60" },
  { icon: Code2, label: "Development", desc: "Full-Stack", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 border-emerald-200/60 dark:bg-emerald-950/50 dark:border-emerald-800/40", iconBg: "bg-emerald-100 dark:bg-emerald-900/60" },
  { icon: FlaskConical, label: "Testing", desc: "Quality Gate", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 border-cyan-200/60 dark:bg-cyan-950/50 dark:border-cyan-800/40", iconBg: "bg-cyan-100 dark:bg-cyan-900/60" },
  { icon: Rocket, label: "Deploy", desc: "CI/CD & UAT", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 border-rose-200/60 dark:bg-rose-950/50 dark:border-rose-800/40", iconBg: "bg-rose-100 dark:bg-rose-900/60" },
];

const capabilities = [
  {
    icon: Workflow,
    title: "8-Phase Development Process",
    description:
      "From requirements analysis to deployment, every phase is structured with clear deliverables, acceptance criteria, and quality gates.",
    highlights: ["BRD / PRD / Architecture Docs", "Automated task breakdown", "Quality gate enforcement"],
  },
  {
    icon: Bot,
    title: "37 Specialized Agent Teams",
    description:
      "AI agents collaborate like a human team — architects design, developers code, reviewers verify, all coordinated by a project-manager agent.",
    highlights: ["Parallel agent execution", "Role-based task dispatch", "Real-time coordination"],
  },
  {
    icon: Sparkles,
    title: "Stitch AI Design Integration",
    description:
      "Generate production-ready UI designs with Google Stitch — from brainstorming style to component specifications, fully AI-driven.",
    highlights: ["Visual prototype generation", "Design system documentation", "shadcn/ui component mapping"],
  },
  {
    icon: Layers,
    title: "Dual-Track Task Management",
    description:
      "Persistent feature list (tasks.json) for cross-session continuity, paired with real-time agent task coordination for live execution.",
    highlights: ["Interruptible & recoverable", "Progress notes across sessions", "Git-integrated checkpoints"],
  },
];

function LandingPageContent() {
  const searchParams = useSearchParams();
  const project = searchParams.get("project");
  const dashboardHref = project ? `/dashboard?project=${encodeURIComponent(project)}` : "/dashboard";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/10 dark:bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-success/10 dark:bg-success/5 blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <TerminalSquare className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">LRAC Console</span>
        </div>
        <Link
          href={dashboardHref}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/35 hover:scale-[1.02] active:scale-[0.98]"
        >
          Enter Console
          <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-20 text-center sm:px-10 sm:pt-24 sm:pb-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm mb-6">
          <GitBranch className="h-3.5 w-3.5" />
          Multi-Agent Collaborative Development Framework
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          AI Agents That Build{" "}
          <span className="bg-gradient-to-r from-primary to-[hsl(28,88%,58%)] dark:to-[hsl(28,80%,65%)] bg-clip-text text-transparent">
            Like a Team
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          37 specialized agents, 8-phase development process, AI-powered design.
          From requirements to deployment — fully coordinated, fully automated.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href={dashboardHref}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/40 hover:scale-[1.03] active:scale-[0.97]"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card/50 px-8 py-3.5 text-base font-medium text-foreground backdrop-blur-sm transition-all hover:bg-card/80 hover:border-muted-foreground/30"
          >
            View Dashboard
          </Link>
        </div>

        {/* Phase flow strip */}
        <div className="mt-16 mx-auto max-w-3xl">
          <div className="relative flex items-center justify-between rounded-2xl border border-border bg-card/60 backdrop-blur-sm px-4 py-4">
            {phases.map((phase, i) => (
              <div key={phase.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${phase.iconBg} transition-transform hover:scale-110`}>
                    <phase.icon className={`h-4.5 w-4.5 ${phase.color}`} />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">{phase.label}</span>
                </div>
                {i < phases.length - 1 && (
                  <div className="flex items-center mx-2 text-muted-foreground/50">
                    <div className="h-px w-3 bg-border" />
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <div className="h-px w-3 bg-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20 sm:px-10">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Capabilities</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Everything You Need to Ship</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {capabilities.map((cap) => (
            <div
              key={cap.title}
              className="group rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/8 hover:-translate-y-0.5"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-[hsl(28,88%,58%,0.1)] dark:from-primary/20 dark:to-primary/10">
                <cap.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{cap.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cap.description}</p>
              <ul className="mt-4 space-y-1.5">
                {cap.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-20 text-center sm:px-10">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card/80 to-[hsl(24,100%,93%,0.4)] dark:to-primary/10 p-10 backdrop-blur-sm">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to Build?</h2>
          <p className="mt-3 text-muted-foreground">
            Enter the console and let AI agents handle the rest.
          </p>
          <Link
            href={dashboardHref}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/40 hover:scale-[1.03] active:scale-[0.97]"
          >
            Enter Console
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        LRAC Console · Multi-Agent Collaborative Development Framework
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LandingPageContent />
    </Suspense>
  );
}
