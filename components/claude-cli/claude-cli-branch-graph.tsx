"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GitCommitNode } from "@/lib/utils/git-insights";

const ROW_H = 26;
const LANE_W = 16;
const PAD_X = 14;
const PAD_Y = 14;
const NODE_R = 4;

const LANE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];

function colorForLane(lane: number) {
  return LANE_COLORS[lane % LANE_COLORS.length] || "rgba(56, 189, 248, 0.95)";
}

type PositionedCommit = GitCommitNode & {
  row: number;
  lane: number;
};

function layoutCommits(commits: GitCommitNode[]): { positioned: PositionedCommit[]; laneCount: number } {
  const activeLanes: Array<string | null> = [];
  const laneBySha = new Map<string, number>();
  const positioned: PositionedCommit[] = [];

  commits.forEach((commit, row) => {
    let lane = activeLanes.indexOf(commit.sha);
    if (lane === -1) {
      lane = activeLanes.indexOf(null);
    }
    if (lane === -1) {
      lane = activeLanes.length;
      activeLanes.push(null);
    }

    laneBySha.set(commit.sha, lane);
    activeLanes[lane] = null;

    const firstParent = commit.parents[0] || null;
    if (firstParent) {
      activeLanes[lane] = firstParent;
    }

    commit.parents.slice(1).forEach((parent) => {
      let parentLane = activeLanes.indexOf(parent);
      if (parentLane === -1) {
        parentLane = activeLanes.indexOf(null);
      }
      if (parentLane === -1) {
        parentLane = activeLanes.length;
        activeLanes.push(null);
      }
      activeLanes[parentLane] = parent;
    });

    positioned.push({
      ...commit,
      row,
      lane,
    });
  });

  const laneCount = Math.max(1, ...positioned.map((entry) => entry.lane + 1));
  return { positioned, laneCount };
}

function xForLane(lane: number) {
  return PAD_X + lane * LANE_W;
}

function yForRow(row: number) {
  return PAD_Y + row * ROW_H + ROW_H / 2;
}

function refTone(ref: string): "default" | "secondary" {
  if (ref.includes("HEAD")) return "default";
  if (ref.startsWith("tag:")) return "default";
  if (ref.startsWith("origin/")) return "secondary";
  return "secondary";
}

function isCurrentBranchCommit(commit: GitCommitNode, currentBranch?: string | null) {
  if (!currentBranch) {
    return false;
  }

  return commit.refs.some(
    (ref) =>
      ref === currentBranch ||
      ref.includes(`HEAD -> ${currentBranch}`) ||
      ref.endsWith(`/${currentBranch}`)
  );
}

export function ClaudeCliBranchGraph({
  commits,
  currentBranch,
  className,
}: {
  commits: GitCommitNode[];
  currentBranch?: string | null;
  className?: string;
}) {
  const [hoveredCommitSha, setHoveredCommitSha] = React.useState<string | null>(null);
  const { positioned, laneCount } = React.useMemo(() => layoutCommits(commits), [commits]);
  const hoveredCommit = React.useMemo(
    () => positioned.find((commit) => commit.sha === hoveredCommitSha) || null,
    [hoveredCommitSha, positioned]
  );
  const positionBySha = React.useMemo(() => {
    const map = new Map<string, { row: number; lane: number }>();
    positioned.forEach((commit) => {
      map.set(commit.sha, { row: commit.row, lane: commit.lane });
    });
    return map;
  }, [positioned]);

  const graphWidth = PAD_X * 2 + Math.max(1, laneCount - 1) * LANE_W + 24;
  const contentHeight = PAD_Y * 2 + Math.max(1, positioned.length) * ROW_H;

  if (commits.length === 0) {
    return (
      <div
        className={cn(
          "rounded-[1.1rem] border border-border/75 bg-background/80 px-4 py-4 text-sm text-muted-foreground",
          className
        )}
      >
        No commit history available.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-auto rounded-[1.1rem] border border-border/75 bg-background/95",
        className
      )}
      style={{ maxHeight: 320 }}
    >
      <svg
        className="pointer-events-none absolute left-0 top-0"
        width={graphWidth}
        height={contentHeight}
        viewBox={`0 0 ${graphWidth} ${contentHeight}`}
        aria-hidden="true"
      >
        {positioned.flatMap((commit) => {
          const x1 = xForLane(commit.lane);
          const y1 = yForRow(commit.row);

          return commit.parents
            .map((parentSha) => {
              const parentPos = positionBySha.get(parentSha);
              if (!parentPos) {
                return null;
              }

              const x2 = xForLane(parentPos.lane);
              const y2 = yForRow(parentPos.row);
              const midY = (y1 + y2) / 2;
              const stroke = colorForLane(commit.lane);

              // A simple two-segment curve to keep it readable.
              const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
              return (
                <path
                  key={`${commit.sha}->${parentSha}`}
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={1.4}
                  opacity={0.7}
                />
              );
            })
            .filter(Boolean);
        })}

        {positioned.map((commit) => {
          const cx = xForLane(commit.lane);
          const cy = yForRow(commit.row);
          const fill = colorForLane(commit.lane);
          const matchesCurrentBranch = isCurrentBranchCommit(commit, currentBranch);
          return (
            <g
              key={commit.sha}
              onMouseEnter={() => setHoveredCommitSha(commit.sha)}
              onMouseLeave={() => setHoveredCommitSha((current) => (current === commit.sha ? null : current))}
            >
              <circle cx={cx} cy={cy} r={NODE_R + 3} fill="hsl(var(--background))" opacity="0.9" />
              <circle cx={cx} cy={cy} r={NODE_R} fill={fill} />
              {matchesCurrentBranch ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={NODE_R + 6}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.4}
                  opacity="0.95"
                />
              ) : null}
            </g>
          );
        })}
      </svg>

      <div style={{ minHeight: contentHeight }}>
        <div style={{ paddingLeft: graphWidth, paddingTop: PAD_Y, paddingBottom: PAD_Y }}>
          {positioned.map((commit) => (
            <div
              key={commit.sha}
              className={cn(
                "grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3 rounded-lg px-3 transition-colors",
                hoveredCommitSha === commit.sha && "bg-accent/35",
                isCurrentBranchCommit(commit, currentBranch) && "ring-1 ring-primary/25"
              )}
              style={{ height: ROW_H }}
              onMouseEnter={() => setHoveredCommitSha(commit.sha)}
              onMouseLeave={() => setHoveredCommitSha((current) => (current === commit.sha ? null : current))}
            >
              <span className="text-[10px] font-mono text-muted-foreground">{commit.shortSha}</span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[11px] font-medium text-foreground">
                    {commit.subject || "(no message)"}
                  </span>
                  {commit.refs.slice(0, 3).map((ref) => (
                    <Badge
                      key={`${commit.sha}:${ref}`}
                      variant={refTone(ref)}
                      className="border-border/70 bg-card/80 text-[10px] text-foreground"
                    >
                      {ref}
                    </Badge>
                  ))}
                  {isCurrentBranchCommit(commit, currentBranch) ? (
                    <Badge className="bg-primary text-primary-foreground text-[10px]">Current Branch</Badge>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {hoveredCommit ? (
        <div className="pointer-events-none sticky bottom-3 mx-3 mt-3 rounded-xl border border-border/75 bg-card/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-border/70 bg-background/80 text-[10px]">
              {hoveredCommit.shortSha}
            </Badge>
            {Boolean(currentBranch) &&
            isCurrentBranchCommit(hoveredCommit, currentBranch) ? (
              <Badge className="bg-primary text-primary-foreground text-[10px]">Current Branch</Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{hoveredCommit.subject || "(no message)"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(hoveredCommit.timestamp).toLocaleString()}
          </p>
          {hoveredCommit.refs.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hoveredCommit.refs.map((ref) => (
                <Badge
                  key={`${hoveredCommit.sha}:${ref}:hover`}
                  variant={refTone(ref)}
                  className="border-border/70 bg-background/80 text-[10px] text-foreground"
                >
                  {ref}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
