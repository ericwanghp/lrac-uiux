import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    isReady: true,
  }),
}));

vi.mock("@/components/shared/global-project-switcher", () => ({
  GlobalProjectSwitcher: () => <div data-testid="project-switcher" />,
}));

vi.mock("@/components/providers/use-project-query-param", () => ({
  useProjectQueryParam: () => "/workspace/demo",
}));

vi.mock("@/components/providers/project-realtime-status-provider", () => ({
  useProjectRealtimeStatus: () => ({
    snapshot: {
      currentPhase: 5,
      currentPhaseLabel: "Development",
      completed: 2,
      total: 5,
      overallProgress: 40,
    },
    isConnected: true,
    isConnecting: false,
    reconnectAttempts: 0,
  }),
}));

vi.mock("@/components/claude-cli/claude-cli-launcher", () => ({
  ClaudeCliLauncher: () => <button type="button">Claude Code</button>,
}));

vi.mock("@/components/shell/shell-launcher", () => ({
  ShellLauncher: () => <button type="button">Open SHELL</button>,
}));

vi.mock("@/components/layout/member-auth-panel", () => ({
  MemberAuthPanel: () => <button type="button">Sign In</button>,
}));

import { Header } from "../../components/layout/header";

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both Claude Code and Open SHELL launchers", () => {
    render(<Header />);

    expect(screen.getByRole("button", { name: /claude code/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /open shell/i })).toBeTruthy();
    expect(screen.getByTestId("project-switcher")).toBeTruthy();
  });

  it("routes to settings for the selected project", async () => {
    const user = userEvent.setup();

    render(<Header />);
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(pushMock).toHaveBeenCalledWith("/settings?project=%2Fworkspace%2Fdemo");
  });
});
