import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "@/components/shared/stat-card";

describe("StatCard", () => {
  it("renders title and value", () => {
    render(<StatCard title="Total Tasks" value={42} />);
    expect(screen.getByText("Total Tasks")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<StatCard title="Tasks" value={10} description="Active tasks" />);
    expect(screen.getByText("Active tasks")).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    const icon = <span data-testid="icon">Icon</span>;
    render(<StatCard title="Tasks" value={10} icon={icon} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders trend with positive value", () => {
    render(<StatCard title="Tasks" value={10} trend={{ value: 25, label: "vs last week" }} />);
    expect(screen.getByText("+25%")).toBeInTheDocument();
    expect(screen.getByText("vs last week")).toBeInTheDocument();
  });

  it("renders trend with negative value", () => {
    render(<StatCard title="Tasks" value={10} trend={{ value: -15, label: "vs last week" }} />);
    expect(screen.getByText("-15%")).toBeInTheDocument();
  });

  it("applies variant styles", () => {
    const { container } = render(<StatCard title="Success" value={10} variant="success" />);
    expect(container.firstChild).toHaveClass("bg-success/10");
  });

  it("renders with string value", () => {
    render(<StatCard title="Status" value="In Progress" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });
});
