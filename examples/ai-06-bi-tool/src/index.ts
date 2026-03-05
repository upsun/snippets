import "dotenv/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { createChat } from "./chat.js";
import { getReadPool } from "./database.js";
import { rateLimiter } from "./rate-limiter.js";
import { validateChatInput } from "./validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = Number.parseInt(process.env.PORT || "3000", 10);

if (!OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY environment variable is required");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "50kb" }));
app.use(express.static(resolve(__dirname, "../../public")));

const chat = createChat();

app.post("/api/chat", rateLimiter, validateChatInput, async (req, res) => {
  const { message, history } = req.body;
  const startTime = performance.now();
  console.log(`[chat] Request: "${message.slice(0, 80)}" | history: ${history?.length ?? 0} items`);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    let chunks = 0;
    let firstChunkTime: number | null = null;
    for await (const chunk of chat.stream(message, history)) {
      if (!firstChunkTime) {
        firstChunkTime = performance.now();
        console.log(`[chat] First chunk in ${(firstChunkTime - startTime).toFixed(0)}ms`);
      }
      chunks++;
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
    console.log(
      `[chat] Done in ${(performance.now() - startTime).toFixed(0)}ms | ${chunks} chunks`,
    );
  } catch (err) {
    console.error(`[chat] Error after ${(performance.now() - startTime).toFixed(0)}ms:`, err);
    res.write(`data: ${JSON.stringify("[Error] An error occurred.")}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

async function start() {
  // Verify DB connectivity
  try {
    const pool = getReadPool();
    await pool.query("SELECT 1");
    console.log("[db] Connection verified");
  } catch (err) {
    console.error("[db] Failed to connect:", err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[server] BI Tool running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});
