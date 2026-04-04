/**
 * Markdown file utilities for reading and writing documentation
 */

import fs from "fs/promises";
import path from "path";
import { sanitizePath, PROJECT_ROOT } from "./file-operations";

const DOCS_DIR = path.join(PROJECT_ROOT, "docs");

export type DocType = "brd" | "prd" | "architecture" | "design" | "research";

/**
 * Get path to documentation file
 */
export function getDocPath(type: DocType, name: string): string {
  const subdirs: Record<DocType, string> = {
    brd: "brd",
    prd: "prd",
    architecture: "architecture",
    design: "design",
    research: "research",
  };

  const subdir = subdirs[type];
  const filename = name.endsWith(".md") ? name : `${name}.md`;
  return path.join(DOCS_DIR, subdir, filename);
}

/**
 * Read markdown file
 */
export async function readMarkdownFile(filePath: string): Promise<string> {
  const sanitizedPath = await sanitizePath(filePath);

  try {
    return await fs.readFile(sanitizedPath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Document not found: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Write markdown file
 */
export async function writeMarkdownFile(filePath: string, content: string): Promise<void> {
  const sanitizedPath = await sanitizePath(filePath);

  // Ensure directory exists
  const dir = path.dirname(sanitizedPath);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(sanitizedPath, content, "utf-8");
}

/**
 * Read BRD (Business Requirements Document)
 */
export async function readBRD(projectName: string): Promise<string> {
  const filePath = getDocPath("brd", `BRD-${projectName}`);
  return readMarkdownFile(filePath);
}

/**
 * Write BRD
 */
export async function writeBRD(projectName: string, content: string): Promise<void> {
  const filePath = getDocPath("brd", `BRD-${projectName}`);
  await writeMarkdownFile(filePath, content);
}

/**
 * Read PRD (Product Requirements Document)
 */
export async function readPRD(projectName: string): Promise<string> {
  const filePath = getDocPath("prd", `PRD-${projectName}`);
  return readMarkdownFile(filePath);
}

/**
 * Write PRD
 */
export async function writePRD(projectName: string, content: string): Promise<void> {
  const filePath = getDocPath("prd", `PRD-${projectName}`);
  await writeMarkdownFile(filePath, content);
}

/**
 * Read Architecture document
 */
export async function readArchitecture(projectName: string): Promise<string> {
  const filePath = getDocPath("architecture", `ARCH-${projectName}`);
  return readMarkdownFile(filePath);
}

/**
 * Write Architecture document
 */
export async function writeArchitecture(projectName: string, content: string): Promise<void> {
  const filePath = getDocPath("architecture", `ARCH-${projectName}`);
  await writeMarkdownFile(filePath, content);
}
