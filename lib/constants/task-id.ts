export const TASK_ID_REGEX = /^[a-z][a-z0-9-]*-[a-z][a-z0-9]*-\d{3}$/;

export const PHASE_SYMBOL_TO_PHASE: Record<string, number> = {
  p1r: 1,
  p1b: 1,
  p2p: 2,
  p25d: 2.5,
  p3a: 3,
  p4b: 4,
  p5d: 5,
  p6t: 6,
  p7d: 7,
  p8m: 8,
};

type ParsedTaskId = {
  iteration: string;
  phaseSymbol: string;
  sequence: string;
};

export function parseTaskId(taskId: string): ParsedTaskId | null {
  const match = taskId.match(/^([a-z][a-z0-9-]*)-([a-z][a-z0-9]*)-(\d{3})$/);
  if (!match || !match[1] || !match[2] || !match[3]) return null;
  return {
    iteration: match[1],
    phaseSymbol: match[2],
    sequence: match[3],
  };
}

export function getPhaseFromTaskId(taskId: string): number | undefined {
  const parsed = parseTaskId(taskId);
  if (!parsed) return undefined;
  return PHASE_SYMBOL_TO_PHASE[parsed.phaseSymbol];
}

export function getPhaseFromParallelGroup(
  parallelGroup: string | null | undefined
): number | undefined {
  if (!parallelGroup) return undefined;
  const match = parallelGroup.match(/^phase-(\d+)(?:-(\d+))?/);
  if (!match) return undefined;
  const major = Number(match[1]);
  if (Number.isNaN(major)) return undefined;
  if (match[2] === "5") return major + 0.5;
  if (major < 1 || major > 8) return undefined;
  return major;
}
