import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility", () => {
  it("should merge class names", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  it("should handle conditional classes", () => {
    const result = cn("class1", false && "class2", "class3");
    expect(result).toBe("class1 class3");
  });

  it("should handle empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle objects with classnames", () => {
    const result = cn({ class1: true, class2: false, class3: true });
    expect(result).toContain("class1");
    expect(result).toContain("class3");
    expect(result).not.toContain("class2");
  });

  it("should handle arrays", () => {
    const result = cn(["class1", "class2"]);
    expect(result).toBe("class1 class2");
  });

  it("should deduplicate tailwind classes", () => {
    const result = cn("px-4 px-2");
    expect(result).toBe("px-2");
  });
});
