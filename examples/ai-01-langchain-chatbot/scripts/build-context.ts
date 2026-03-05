#!/usr/bin/env tsx
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const DOCS_DIR = "docs/sites/upsun/src";
const OUTPUT_FILE = "context.txt";

interface DocFile {
  path: string;
  content: string;
}

function findMarkdownFiles(dir: string, files: DocFile[] = []): DocFile[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      findMarkdownFiles(fullPath, files);
    } else if (entry.endsWith(".md") || entry.endsWith(".mdx")) {
      try {
        const content = readFileSync(fullPath, "utf-8");
        const relativePath = relative(DOCS_DIR, fullPath);
        files.push({ path: relativePath, content });
      } catch (err) {
        console.warn(`[build-context] Failed to read ${fullPath}:`, err);
      }
    }
  }

  return files;
}

function buildContext(): void {
  console.log(`[build-context] Scanning ${DOCS_DIR} for markdown files...`);

  const files = findMarkdownFiles(DOCS_DIR);
  console.log(`[build-context] Found ${files.length} markdown files`);

  let contextText = "";

  for (const file of files) {
    // Generate docs.upsun.com URL from file path
    // e.g., "guides/deployment.md" -> "https://docs.upsun.com/guides/deployment.html"
    const urlPath = file.path.replace(/\.mdx?$/, ".html").replace(/\/index\.html$/, "/");

    contextText += "\n\n========================================\n";
    contextText += `FILE: ${file.path}\n`;
    contextText += `URL: https://docs.upsun.com/${urlPath}\n`;
    contextText += "========================================\n\n";
    contextText += file.content;
  }

  writeFileSync(OUTPUT_FILE, contextText, "utf-8");
  console.log(`[build-context] Written ${contextText.length} characters to ${OUTPUT_FILE}`);
}

buildContext();
