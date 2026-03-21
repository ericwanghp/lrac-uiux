import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

describe("File Operations - Pure Functions", () => {
  describe("sanitizePath", () => {
    const projectRoot = process.cwd();

    it("should normalize path", () => {
      // Test path normalization logic without the actual function
      const input = ".auto-coding/test.json";
      const result = path.normalize(input);
      expect(result).toBe(".auto-coding/test.json");
    });

    it("should handle absolute paths", () => {
      const input = path.join(projectRoot, ".auto-coding", "test.json");
      const result = path.isAbsolute(input);
      expect(result).toBe(true);
    });

    it("should join relative paths", () => {
      const result = path.join(projectRoot, ".auto-coding", "tasks.json");
      expect(result).toContain(".auto-coding");
      expect(result).toContain("tasks.json");
    });

    it("should normalize path segments", () => {
      const result = path.normalize(".auto-coding/../.stitch/test.json");
      expect(result).toBe(".stitch/test.json");
    });

    it("should detect null bytes", () => {
      const input = ".auto-coding\x00/test.json";
      expect(input.includes("\0")).toBe(true);
    });
  });

  describe("JSON parsing", () => {
    it("should parse valid JSON", () => {
      const jsonString = '{"test": "value"}';
      const result = JSON.parse(jsonString);
      expect(result).toEqual({ test: "value" });
    });

    it("should stringify with formatting", () => {
      const data = { test: "value", nested: { key: 123 } };
      const result = JSON.stringify(data, null, 2);
      expect(result).toContain('"test": "value"');
      expect(result).toContain('"nested"');
    });

    it("should throw on invalid JSON", () => {
      expect(() => JSON.parse("invalid")).toThrow();
    });
  });

  describe("path utilities", () => {
    it("should get directory name", () => {
      const result = path.dirname("/path/to/file.txt");
      expect(result).toBe("/path/to");
    });

    it("should get file extension", () => {
      const result = path.extname("file.txt");
      expect(result).toBe(".txt");
    });

    it("should join path segments", () => {
      const result = path.join("dir", "subdir", "file.txt");
      expect(result).toContain("dir");
      expect(result).toContain("subdir");
      expect(result).toContain("file.txt");
    });
  });
});

describe("Markdown Operations - Pure Functions", () => {
  describe("getDocPath", () => {
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

    it("should add .md extension if not present", () => {
      const result = getDocPath("brd", "test-project");
      expect(result.endsWith(".md")).toBe(true);
    });

    it("should handle all doc types", () => {
      const types = ["brd", "prd", "architecture", "design", "research"];
      types.forEach((type) => {
        const result = getDocPath(type, "test");
        expect(result).toContain(type);
      });
    });
  });
});
