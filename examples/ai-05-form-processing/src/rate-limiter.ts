import type { NextFunction, Request, Response } from "express";

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20;

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const ipRequests = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
	const now = Date.now();
	for (const [ip, entry] of ipRequests.entries()) {
		if (entry.resetAt < now) {
			ipRequests.delete(ip);
		}
	}
}, WINDOW_MS);

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
	const ip = req.ip || req.socket.remoteAddress || "unknown";
	const now = Date.now();

	let entry = ipRequests.get(ip);

	if (!entry || entry.resetAt < now) {
		entry = { count: 0, resetAt: now + WINDOW_MS };
		ipRequests.set(ip, entry);
	}

	entry.count++;

	if (entry.count > MAX_REQUESTS) {
		const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
		res.setHeader("Retry-After", retryAfter.toString());
		res.status(429).json({
			error: "Too many requests. Please try again later.",
			retryAfter,
		});
		return;
	}

	next();
}
