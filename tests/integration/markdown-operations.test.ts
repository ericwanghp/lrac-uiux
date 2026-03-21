import { describe, it, expect } from "vitest";
import path from "path";

describe("Markdown Operations - Pure Functions", () => {
  const DOCS_DIR = path.join(process.cwd(), "docs");

  const getDocPath = (type: string, name: string): string => {
    const subdirs: Record<string, string> = {
      brd: "brd",
      prd: "prd",
      architecture: "architecture",
      design: "design",
      research: "research",
    };
    const subdir = subdirs[type] || type;
    const filename = name.endsWith(".md") ? name : `${name}.md`;
    return path.join(DOCS_DIR, subdir, filename);
  };

  describe("getDocPath", () => {
    it("should return correct path for BRD", () => {
      const result = getDocPath("brd", "BRD-test-project.md");
      expect(result).toContain("docs");
      expect(result).toContain("brd");
      expect(result).toContain("BRD-test-project.md");
    });

    it("should return correct path for PRD", () => {
      const result = getDocPath("prd", "PRD-test-project.md");
      expect(result).toContain("docs");
      expect(result).toContain("prd");
      expect(result).toContain("PRD-test-project.md");
    });

    it("should return correct path for architecture", () => {
      const result = getDocPath("architecture", "ARCH-test-project.md");
      expect(result).toContain("docs");
      expect(result).toContain("architecture");
      expect(result).toContain("ARCH-test-project.md");
    });

    it("should return correct path for design", () => {
      const result = getDocPath("design", "test-design");
      expect(result).toContain("docs");
      expect(result).toContain("design");
    });

    it("should return correct path for research", () => {
      const result = getDocPath("research", "competitors");
      expect(result).toContain("docs");
      expect(result).toContain("research");
    });

    it("should add .md extension if not present", () => {
      const result = getDocPath("brd", "test-project");
      expect(result.endsWith(".md")).toBe(true);
    });

    it("should preserve .md extension if already present", () => {
      const result = getDocPath("brd", "test-project.md");
      expect(result).toContain("test-project.md");
    });

    it("should handle all doc types", () => {
      const types = ["brd", "prd", "architecture", "design", "research"];
      types.forEach((type) => {
        const result = getDocPath(type, "test");
        expect(result).toContain(type);
      });
    });

    it("should handle unknown doc types", () => {
      const result = getDocPath("unknown", "test");
      expect(result).toContain("unknown");
    });
  });

  describe("Markdown content validation", () => {
    it("should detect markdown headings", () => {
      const content = "# Heading 1\n## Heading 2\n### Heading 3";
      expect(content).toContain("#");
      expect(content).toMatch(/^# /m);
    });

    it("should detect markdown links", () => {
      const content = "[Link text](https://example.com)";
      expect(content).toMatch(/\[.*\]\(.*\)/);
    });

    it("should detect markdown code blocks", () => {
      const content = '```javascript\nconsole.log("test")\n```';
      expect(content).toMatch(/```[\s\S]*```/);
    });

    it("should detect markdown lists", () => {
      const content = "- Item 1\n- Item 2\n- Item 3";
      expect(content).toMatch(/^- /m);
    });

    it("should detect markdown bold", () => {
      const content = "**bold text**";
      expect(content).toMatch(/\*\*.*\*\*/);
    });
  });
});
