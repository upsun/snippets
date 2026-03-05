import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Limit context to ~50K tokens (200K chars) accounting for datamarking doubling the size
const MAX_CONTEXT_LENGTH = 200_000;

let cachedContext = "";

export function getContext(): string {
  return cachedContext;
}

export function loadContext(contextPath: string): void {
  try {
    const fullPath = resolve(contextPath);
    const fullContext = readFileSync(fullPath, "utf-8");

    if (fullContext.length > MAX_CONTEXT_LENGTH) {
      cachedContext = fullContext.slice(0, MAX_CONTEXT_LENGTH);
      console.log(`[context] Truncated context from ${fullContext.length} to ${cachedContext.length} characters`);
    } else {
      cachedContext = fullContext;
    }
    console.log(`[context] Loaded ${cachedContext.length} characters from ${fullPath}`);
  } catch (err) {
    throw new Error(
      `Failed to load context from ${contextPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
