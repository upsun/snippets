import "dotenv/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { classifyTicket } from "./classifier.js";
import { rateLimiter } from "./rate-limiter.js";
import { validateTicketInput } from "./validation.js";

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
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

app.use(express.static(resolve(__dirname, "../public")));

app.post("/api/classify", rateLimiter, validateTicketInput, async (req, res) => {
	const { ticket } = req.body;
	const startTime = performance.now();
	console.log(`[classify] Request: "${ticket.slice(0, 80)}..."`);

	try {
		const result = await classifyTicket(ticket);
		const elapsed = (performance.now() - startTime).toFixed(0);
		console.log(`[classify] Done in ${elapsed}ms | Category: ${result.category}`);
		res.json(result);
	} catch (err) {
		console.error(`[classify] Error after ${(performance.now() - startTime).toFixed(0)}ms:`, err);
		res.status(500).json({ error: "Classification failed. Please try again." });
	}
});

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.listen(PORT, () => {
	console.log(`[server] Support ticket classifier running on port ${PORT}`);
});
