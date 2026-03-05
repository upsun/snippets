#!/usr/bin/env tsx
/**
 * Embeds documentation chunks into Qdrant vector database.
 * Uses markdown-aware semantic chunking that respects document structure.
 */
import "dotenv/config";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

const DOCS_DIR = "docs/sites/upsun/src";
const COLLECTION_NAME = "upsun_docs";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 50;

// Chunking parameters
const MIN_CHUNK_SIZE = 200; // Don't create tiny chunks
const MAX_CHUNK_SIZE = 2000; // Split if section exceeds this
const IDEAL_CHUNK_SIZE = 1200; // Target size for splitting large sections

interface DocChunk {
  id: string;
  filePath: string;
  url: string;
  title: string;
  breadcrumb: string; // Heading hierarchy: "PostgreSQL > Configuration"
  content: string;
  headingLevel: number;
  chunkIndex: number;
}

interface MarkdownSection {
  level: number; // 1 for H1, 2 for H2, etc.
  heading: string;
  content: string;
  startLine: number;
}

function getQdrantConfig(): { host: string; port: number } {
  const relationships = process.env.PLATFORM_RELATIONSHIPS;
  if (relationships) {
    try {
      const decoded = JSON.parse(Buffer.from(relationships, "base64").toString("utf-8"));
      if (decoded.qdrant?.[0]) {
        const qdrant = decoded.qdrant[0];
        return {
          host: qdrant.host || "localhost",
          port: qdrant.port || 6333,
        };
      }
    } catch (err) {
      console.warn("[embed] Failed to parse PLATFORM_RELATIONSHIPS:", err);
    }
  }
  return {
    host: process.env.QDRANT_HOST || "localhost",
    port: Number.parseInt(process.env.QDRANT_PORT || "6333", 10),
  };
}

function findMarkdownFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findMarkdownFiles(fullPath, files);
    } else if (entry.endsWith(".md") || entry.endsWith(".mdx")) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractFrontmatter(content: string): {
  title: string;
  description: string;
  body: string;
} {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    return { title: "", description: "", body: content };
  }

  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  const titleMatch = frontmatter.match(/title:\s*["']?([^"'\n]+)["']?/);
  const descMatch = frontmatter.match(/description:\s*["']?([^"'\n]+)["']?/);

  return {
    title: titleMatch ? titleMatch[1].trim() : "",
    description: descMatch ? descMatch[1].trim() : "",
    body,
  };
}

function cleanContent(content: string): string {
  let cleaned = content;
  // Remove Hugo shortcodes
  cleaned = cleaned.replace(/\{\{[<>%][\s\S]*?[>%]\}\}/g, "");
  // Normalize whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

/**
 * Parse markdown into sections based on headings.
 * Preserves code blocks as atomic units.
 */
function parseMarkdownSections(content: string): MarkdownSection[] {
  const lines = content.split("\n");
  const sections: MarkdownSection[] = [];

  let currentSection: MarkdownSection | null = null;
  let inCodeBlock = false;
  let contentBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track code blocks to avoid treating # inside code as headings
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      contentBuffer.push(line);
      continue;
    }

    // Check for heading (only outside code blocks)
    const headingMatch = !inCodeBlock && line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentBuffer.join("\n").trim();
        if (currentSection.content || currentSection.heading) {
          sections.push(currentSection);
        }
      }

      // Start new section
      currentSection = {
        level: headingMatch[1].length,
        heading: headingMatch[2].trim(),
        content: "",
        startLine: i,
      };
      contentBuffer = [];
    } else {
      contentBuffer.push(line);
    }
  }

  // Don't forget the last section
  if (currentSection) {
    currentSection.content = contentBuffer.join("\n").trim();
    if (currentSection.content || currentSection.heading) {
      sections.push(currentSection);
    }
  }

  // If no headings found, treat entire content as one section
  if (sections.length === 0 && content.trim()) {
    sections.push({
      level: 0,
      heading: "",
      content: content.trim(),
      startLine: 0,
    });
  }

  return sections;
}

/**
 * Build breadcrumb from heading hierarchy.
 */
function buildBreadcrumb(headingStack: string[]): string {
  return headingStack.filter(Boolean).join(" > ");
}

/**
 * Split content by paragraphs but keep code blocks as atomic units.
 */
function splitPreservingCodeBlocks(content: string): string[] {
  const blocks: string[] = [];
  const lines = content.split("\n");

  let currentBlock: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        // End of code block
        currentBlock.push(line);
        blocks.push(currentBlock.join("\n"));
        currentBlock = [];
        inCodeBlock = false;
      } else {
        // Start of code block
        if (currentBlock.length > 0) {
          const paragraph = currentBlock.join("\n").trim();
          if (paragraph) {
            blocks.push(paragraph);
          }
          currentBlock = [];
        }
        currentBlock.push(line);
        inCodeBlock = true;
      }
    } else if (inCodeBlock) {
      currentBlock.push(line);
    } else if (line.trim() === "") {
      // Empty line outside code block
      if (currentBlock.length > 0) {
        const paragraph = currentBlock.join("\n").trim();
        if (paragraph) {
          blocks.push(paragraph);
        }
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    const paragraph = currentBlock.join("\n").trim();
    if (paragraph) {
      blocks.push(paragraph);
    }
  }

  return blocks;
}

/**
 * Split a large section into smaller chunks while preserving code blocks.
 */
function splitLargeSection(content: string, maxSize: number): string[] {
  if (content.length <= maxSize) {
    return [content];
  }

  const chunks: string[] = [];
  const blocks = splitPreservingCodeBlocks(content);
  let currentChunk = "";

  for (const block of blocks) {
    if (currentChunk.length + block.length > maxSize && currentChunk.length >= MIN_CHUNK_SIZE) {
      chunks.push(currentChunk.trim());
      currentChunk = block;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + block;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Process a file into semantic chunks.
 */
function chunkFile(content: string, filePath: string, url: string): DocChunk[] {
  const { title, description, body } = extractFrontmatter(content);
  const cleanedBody = cleanContent(body);
  const sections = parseMarkdownSections(cleanedBody);

  const chunks: DocChunk[] = [];
  const headingStack: string[] = [title]; // Start with page title
  let chunkIndex = 0;

  // Add page intro if there's a description
  if (description && description.length >= MIN_CHUNK_SIZE) {
    chunks.push({
      id: `${filePath}:intro`,
      filePath,
      url,
      title,
      breadcrumb: title,
      content: description,
      headingLevel: 0,
      chunkIndex: chunkIndex++,
    });
  }

  for (const section of sections) {
    // Update heading stack based on level
    while (headingStack.length > section.level && headingStack.length > 1) {
      headingStack.pop();
    }
    if (section.heading) {
      headingStack[section.level] = section.heading;
      headingStack.length = section.level + 1;
    }

    const breadcrumb = buildBreadcrumb(headingStack);

    // Combine heading with content for the chunk
    const fullContent = section.heading
      ? `## ${section.heading}\n\n${section.content}`
      : section.content;

    // Skip tiny sections
    if (fullContent.length < MIN_CHUNK_SIZE) {
      continue;
    }

    // Split if too large
    const contentChunks = splitLargeSection(fullContent, MAX_CHUNK_SIZE);

    for (let i = 0; i < contentChunks.length; i++) {
      const chunkContent = contentChunks[i];

      // For split chunks, add part indicator
      const chunkBreadcrumb =
        contentChunks.length > 1
          ? `${breadcrumb} (part ${i + 1}/${contentChunks.length})`
          : breadcrumb;

      chunks.push({
        id: `${filePath}:${chunkIndex}`,
        filePath,
        url,
        title,
        breadcrumb: chunkBreadcrumb,
        content: chunkContent,
        headingLevel: section.level,
        chunkIndex: chunkIndex++,
      });
    }
  }

  return chunks;
}

async function embedBatch(openai: OpenAI, texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

async function main() {
  console.log("[embed] Starting semantic documentation embedding...");

  if (!process.env.OPENAI_API_KEY) {
    console.error("[embed] ERROR: OPENAI_API_KEY is required");
    process.exit(1);
  }

  const qdrantConfig = getQdrantConfig();
  console.log(`[embed] Connecting to Qdrant at ${qdrantConfig.host}:${qdrantConfig.port}`);

  const qdrant = new QdrantClient(qdrantConfig);
  const openai = new OpenAI();

  // Check Qdrant connection
  try {
    await qdrant.getCollections();
    console.log("[embed] Qdrant connection successful");
  } catch (err) {
    console.error("[embed] ERROR: Cannot connect to Qdrant:", err);
    process.exit(1);
  }

  // Find markdown files
  console.log(`[embed] Scanning ${DOCS_DIR}...`);
  const files = findMarkdownFiles(DOCS_DIR);
  console.log(`[embed] Found ${files.length} markdown files`);

  // Process files into semantic chunks
  const allChunks: DocChunk[] = [];
  let processedFiles = 0;
  let skippedFiles = 0;

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, "utf-8");
      const relativePath = relative(DOCS_DIR, filePath);
      const urlPath = relativePath
        .replace(/\.mdx?$/, ".html")
        .replace(/\/_index\.html$/, "/")
        .replace(/\/index\.html$/, "/");
      const url = `https://docs.upsun.com/${urlPath}`;

      const chunks = chunkFile(content, relativePath, url);
      allChunks.push(...chunks);
      processedFiles++;
    } catch (err) {
      console.warn(`[embed] Skipped ${filePath}:`, err);
      skippedFiles++;
    }
  }

  console.log(
    `[embed] Created ${allChunks.length} semantic chunks from ${processedFiles} files (${skippedFiles} skipped)`,
  );

  // Log chunk size distribution
  const sizes = allChunks.map((c) => c.content.length);
  const avgSize = Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);
  console.log(`[embed] Chunk sizes: min=${minSize}, avg=${avgSize}, max=${maxSize} chars`);

  // Recreate collection
  try {
    await qdrant.deleteCollection(COLLECTION_NAME);
    console.log(`[embed] Deleted existing collection: ${COLLECTION_NAME}`);
  } catch {
    // Collection might not exist
  }

  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: {
      size: EMBEDDING_DIMENSIONS,
      distance: "Cosine",
    },
  });
  console.log(`[embed] Created collection: ${COLLECTION_NAME}`);

  // Embed and upsert in batches
  let totalUpserted = 0;
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);

    // Create embedding text: breadcrumb + content for better semantic matching
    const texts = batch.map((c) => `${c.breadcrumb}\n\n${c.content}`);

    console.log(
      `[embed] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allChunks.length / BATCH_SIZE)} (${batch.length} chunks)...`,
    );

    const embeddings = await embedBatch(openai, texts);

    const points = batch.map((chunk, idx) => ({
      id: totalUpserted + idx,
      vector: embeddings[idx],
      payload: {
        file_path: chunk.filePath,
        url: chunk.url,
        title: chunk.title,
        breadcrumb: chunk.breadcrumb,
        content: chunk.content,
        heading_level: chunk.headingLevel,
        chunk_index: chunk.chunkIndex,
      },
    }));

    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points,
    });

    totalUpserted += batch.length;
  }

  console.log(`[embed] Complete! ${totalUpserted} semantic chunks indexed in Qdrant`);
}

main().catch((err) => {
  console.error("[embed] Fatal error:", err);
  process.exit(1);
});
