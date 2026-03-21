import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

describe("Card", () => {
  it("renders a card", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("renders card with header", () => {
    render(
      <Card>
        <CardHeader>Header content</CardHeader>
      </Card>
    );
    expect(screen.getByText("Header content")).toBeInTheDocument();
  });

  it("renders card with title", () => {
    render(
      <Card>
        <CardTitle>Card Title</CardTitle>
      </Card>
    );
    expect(screen.getByText("Card Title")).toBeInTheDocument();
  });

  it("renders card with description", () => {
    render(
      <Card>
        <CardDescription>Card description</CardDescription>
      </Card>
    );
    expect(screen.getByText("Card description")).toBeInTheDocument();
  });

  it("renders card with content", () => {
    render(
      <Card>
        <CardContent>Card content</CardContent>
      </Card>
    );
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("renders card with footer", () => {
    render(
      <Card>
        <CardFooter>Card footer</CardFooter>
      </Card>
    );
    expect(screen.getByText("Card footer")).toBeInTheDocument();
  });

  it("renders complete card structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });
});
