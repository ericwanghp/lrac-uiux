import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";

const pushMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    isReady: true,
  }),
  useSearchParams: () => new URLSearchParams("project=%2Fworkspace%2Fdemo"),
}));

vi.mock("@/components/shared/global-project-switcher", () => ({
  GlobalProjectSwitcher: () => <div data-testid="project-switcher" />,
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

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <div>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ value: string; onValueChange: (value: string) => void }>, {
              value,
              onValueChange,
            })
          : child
      )}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <label>
      Launcher
      <select
        aria-label="Launcher"
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {children}
      </select>
    </label>
  ),
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import { Header } from "@/components/layout/header";

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("opens Tasks Log by default for the selected project", async () => {
    const user = userEvent.setup();

    render(<Header />);
    await user.click(screen.getByRole("button", { name: "Open" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/tasks-log?project=%2Fworkspace%2Fdemo");
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("can still open the native workspace Terminal launcher API", async () => {
    const user = userEvent.setup();

    render(<Header />);
    await user.selectOptions(screen.getByLabelText("Launcher"), "terminal");
    await user.click(screen.getByRole("button", { name: "Open" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/launcher/terminal?project=%2Fworkspace%2Fdemo", {
        method: "POST",
      });
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
