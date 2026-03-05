import "dotenv/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { Redis } from "ioredis";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number.parseInt(process.env.PORT || "3000", 10);

// Parse Redis connection from Upsun relationship or use local
function getRedisConfig(): { host: string; port: number } {
  const relationships = process.env.PLATFORM_RELATIONSHIPS;
  if (relationships) {
    const parsed = JSON.parse(Buffer.from(relationships, "base64").toString());
    if (parsed.redis?.[0]) {
      return {
        host: parsed.redis[0].host,
        port: parsed.redis[0].port,
      };
    }
  }
  return { host: "localhost", port: 6379 };
}

const redisConfig = getRedisConfig();
const redis = new Redis(redisConfig);

console.log(`[redis] Connecting to ${redisConfig.host}:${redisConfig.port}`);

const app = express();
app.use(cors());
app.use(express.json({ limit: "50kb" }));

// Serve static frontend
app.use(express.static(resolve(__dirname, "../public")));

// Request a new digest
app.post("/api/digest", async (req, res) => {
  const { topics } = req.body;
  const jobId = uuidv4();

  const job = {
    id: jobId,
    topics: topics || ["technology", "business", "science"],
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  // Queue the job for the worker
  await redis.lpush("digest:queue", JSON.stringify(job));
  await redis.set(`digest:job:${jobId}`, JSON.stringify(job), "EX", 3600);

  console.log(`[api] Queued digest job ${jobId} with topics: ${job.topics.join(", ")}`);

  res.json({ jobId, status: "pending" });
});

// Get digest status/result
app.get("/api/digest/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const jobData = await redis.get(`digest:job:${jobId}`);

  if (!jobData) {
    return res.status(404).json({ error: "Job not found" });
  }

  const job = JSON.parse(jobData);
  res.json(job);
});

// Get latest completed digest
app.get("/api/digest", async (req, res) => {
  const latestId = await redis.get("digest:latest");
  if (!latestId) {
    return res.json({ status: "none", message: "No digests available yet" });
  }

  const jobData = await redis.get(`digest:job:${latestId}`);
  if (!jobData) {
    return res.json({ status: "none", message: "No digests available yet" });
  }

  res.json(JSON.parse(jobData));
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`[server] News digest frontend running on port ${PORT}`);
});
