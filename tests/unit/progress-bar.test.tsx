import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "@/components/shared/progress-bar";

describe("ProgressBar", () => {
  it("renders progress bar", () => {
    render(<ProgressBar value={50} />);
    const progressFill = document.querySelector('[style*="width: 50%"]');
    expect(progressFill).toBeInTheDocument();
  });

  it("calculates percentage correctly", () => {
    render(<ProgressBar value={25} max={100} />);
    const progressFill = document.querySelector('[style*="width: 25%"]');
    expect(progressFill).toBeInTheDocument();
  });

  it("clamps value to max", () => {
    render(<ProgressBar value={150} max={100} />);
    const progressFill = document.querySelector('[style*="width: 100%"]');
    expect(progressFill).toBeInTheDocument();
  });

  it("clamps value to min 0", () => {
    render(<ProgressBar value={-10} max={100} />);
    const progressFill = document.querySelector('[style*="width: 0%"]');
    expect(progressFill).toBeInTheDocument();
  });

  it("shows label when showLabel is true", () => {
    render(<ProgressBar value={50} showLabel />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("does not show label by default", () => {
    render(<ProgressBar value={50} />);
    expect(screen.queryByText("50%")).not.toBeInTheDocument();
  });

  it("applies variant styles", () => {
    render(<ProgressBar value={50} variant="success" />);
    const progressFill = document.querySelector(".bg-success");
    expect(progressFill).toBeInTheDocument();
  });

  it("applies size styles", () => {
    render(<ProgressBar value={50} size="lg" />);
    const container = document.querySelector(".h-3");
    expect(container).toBeInTheDocument();
  });
});
