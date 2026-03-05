/**
 * Qdrant vector database service for RAG retrieval.
 */
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

const COLLECTION_NAME = "upsun_docs";
const EMBEDDING_MODEL = "text-embedding-3-small";
const TOP_K = 5;
const SCORE_THRESHOLD = 0.3;

export interface SearchResult {
  url: string;
  title: string;
  breadcrumb: string;
  content: string;
  score: number;
  filePath: string;
  chunkIndex: number;
}

let qdrantClient: QdrantClient | null = null;
let openaiClient: OpenAI | null = null;

function getQdrantConfig(): { host: string; port: number } {
  // On Upsun, read from PLATFORM_RELATIONSHIPS
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
      console.warn("[qdrant] Failed to parse PLATFORM_RELATIONSHIPS:", err);
    }
  }

  // Fall back to explicit env vars (for local development)
  const host = process.env.QDRANT_HOST || "localhost";
  const port = Number.parseInt(process.env.QDRANT_PORT || "6333", 10);
  return { host, port };
}

export function initQdrant(): void {
  const config = getQdrantConfig();
  console.log(`[qdrant] Connecting to ${config.host}:${config.port}`);
  qdrantClient = new QdrantClient({
    host: config.host,
    port: config.port,
  });
  openaiClient = new OpenAI();
}

export async function checkQdrantHealth(): Promise<boolean> {
  if (!qdrantClient) {
    return false;
  }
  try {
    const collections = await qdrantClient.getCollections();
    const hasCollection = collections.collections.some((c) => c.name === COLLECTION_NAME);
    if (!hasCollection) {
      console.warn(`[qdrant] Collection ${COLLECTION_NAME} not found`);
      return false;
    }
    const info = await qdrantClient.getCollection(COLLECTION_NAME);
    console.log(`[qdrant] Collection ${COLLECTION_NAME} has ${info.points_count} points`);
    return true;
  } catch (err) {
    console.error("[qdrant] Health check failed:", err);
    return false;
  }
}

async function embedQuery(query: string): Promise<number[]> {
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized");
  }
  const response = await openaiClient.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  });
  return response.data[0].embedding;
}

export async function searchDocs(query: string): Promise<SearchResult[]> {
  if (!qdrantClient) {
    throw new Error("Qdrant client not initialized");
  }

  const startTime = performance.now();
  const queryEmbedding = await embedQuery(query);
  const embedTime = performance.now() - startTime;

  const searchStart = performance.now();
  const results = await qdrantClient.search(COLLECTION_NAME, {
    vector: queryEmbedding,
    limit: TOP_K,
    score_threshold: SCORE_THRESHOLD,
    with_payload: true,
  });
  const searchTime = performance.now() - searchStart;

  console.log(
    `[qdrant] Search: embed=${embedTime.toFixed(0)}ms, search=${searchTime.toFixed(0)}ms, results=${results.length}`,
  );

  return results.map((r) => ({
    url: String(r.payload?.url || ""),
    title: String(r.payload?.title || ""),
    breadcrumb: String(r.payload?.breadcrumb || r.payload?.title || ""),
    content: String(r.payload?.content || ""),
    score: r.score,
    filePath: String(r.payload?.file_path || ""),
    chunkIndex: Number(r.payload?.chunk_index || 0),
  }));
}
