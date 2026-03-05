import type { NextFunction, Request, Response } from "express";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_ENTRIES = 20;
const MAX_HISTORY_CONTENT_LENGTH = 2000;
const VALID_ROLES = new Set(["user", "assistant"]);

const INJECTION_PATTERNS = [
  // English patterns
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /reveal\s+(your|the|system)\s+(prompt|instructions|rules)/i,
  /developer\s+mode/i,
  /system\s+override/i,
  /you\s+are\s+now\s+(a|an|in)/i,
  /act\s+as\s+(a|an)\s+(developer|admin|root)/i,
  /bypass\s+(all\s+)?(restrictions|filters|rules|safety)/i,
  /jailbreak/i,
  /do\s+anything\s+now/i,
  /DAN\s+mode/i,
];

export function validateChatInput(req: Request, res: Response, next: NextFunction): void {
  const { message, history } = req.body;

  // Message length check
  if (typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: "Invalid request." });
    return;
  }

  // Regex injection pattern detection on message
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      res.status(400).json({ error: "Invalid request." });
      return;
    }
  }

  // History validation: sanitize in-place
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
