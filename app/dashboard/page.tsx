import {
  DashboardStats,
  MilestoneTracks,
  ProjectContext,
  PersistenceSnapshot,
  ActionQueue,
  ApprovalGates,
  BlockerQueue,
  RecentActivity,
} from "@/components/dashboard/stats-grid";
import { loadDashboardData } from "@/components/dashboard/data";
import { ProjectSwitcherForm } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ project?: string }>;
}) {
  const { project } = (await searchParams) ?? {};
  const data = await loadDashboardData(project);

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
        <div>
          <p className="admin-kicker mb-1">Control Tower</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.projectName} · {data.projectRoot}
          </p>
        </div>
        <CreateProjectDialog
          workspaceRoot={data.workspaceRoot}
          setupScriptPath={data.setupScriptPath}
        />
      </div>

      {/* Project Switcher */}
      <Card data-tour="project-switcher" className="admin-panel border-border/60 bg-card/90 animate-fade-in-up">
        <CardHeader>
          <CardTitle className="text-base">Project Switcher</CardTitle>
          <CardDescription>Switch between workspace projects</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectSwitcherForm
            availableProjects={data.availableProjects}
            currentProjectRoot={data.projectRoot}
          />
        </CardContent>
      </Card>

      {/* Milestone Tracks */}
      <div data-tour="milestone-tracks">
        <MilestoneTracks tracks={data.milestoneTracks} />
      </div>

      {/* Stats */}
      <div data-tour="project-metrics">
        <DashboardStats data={data} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          <div data-tour="project-context">
            <ProjectContext data={data} />
          </div>
          <PersistenceSnapshot data={data} />
        </div>

        <div className="space-y-4 lg:space-y-6">
          <ActionQueue data={data} />
          <div data-tour="approval-gates">
            <ApprovalGates summaries={data.phaseGateSummaries} projectRoot={data.projectRoot} />
          </div>
          <BlockerQueue data={data} />
          <div data-tour="recent-activity">
            <RecentActivity activities={data.activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
