import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/shared/status-badge";

describe("StatusBadge", () => {
  it("renders with default label", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders with custom label", () => {
    render(<StatusBadge status="in_progress" label="Working" />);
    expect(screen.getByText("Working")).toBeInTheDocument();
  });

  it("renders pending status", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders in_progress status", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("in progress")).toBeInTheDocument();
  });

  it("renders completed status", () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("renders blocked status", () => {
    render(<StatusBadge status="blocked" />);
    expect(screen.getByText("blocked")).toBeInTheDocument();
  });

  it("renders active status", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders with different sizes", () => {
    const { container } = render(<StatusBadge status="pending" size="sm" />);
    expect(container.firstChild).toHaveClass("text-xs");
  });
});
