import type { NextFunction, Request, Response } from "express";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_ENTRIES = 20;
const MAX_HISTORY_CONTENT_LENGTH = 2000;
const VALID_ROLES = new Set(["user", "assistant"]);

export function validateChatInput(req: Request, res: Response, next: NextFunction): void {
  const { message, history } = req.body;

  if (typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: "Invalid request." });
    return;
  }

  if (history && Array.isArray(history)) {
    const sanitized = history
      .filter((item: { role?: string; message?: string; content?: string }) => {
        if (!item || typeof item !== "object") return false;
        if (!VALID_ROLES.has(item.role as string)) return false;
        const content = item.message ?? item.content;
        if (typeof content !== "string" || content.length > MAX_HISTORY_CONTENT_LENGTH)
          return false;
        return true;
      })
      .slice(-MAX_HISTORY_ENTRIES);
    req.body.history = sanitized;
  }

  next();
}
