/**
 * Output filtering for LLM response chunks.
 * Strips exfiltration vectors and redacts credentials.
 */

// Strip markdown images
const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\(https?:\/\/[^)]+\)/g;

// Strip HTML img tags
const HTML_IMG_RE = /<img\s[^>]*>/gi;

// Strip external markdown links (keep internal ones starting with /)
const EXTERNAL_LINK_RE = /\[[^\]]*\]\(https?:\/\/(?!docs\.upsun\.com)[^)]+\)/g;

// API key patterns
const CREDENTIAL_PATTERNS = [
  /sk-[A-Za-z0-9_-]{20,}/g,
  /pk-[A-Za-z0-9_-]{20,}/g,
  /api_key=[A-Za-z0-9_-]{10,}/g,
  /api-key:\s*[A-Za-z0-9_-]{10,}/g,
  /bearer\s+[A-Za-z0-9_.-]{20,}/gi,
  /token=[A-Za-z0-9_.-]{20,}/g,
];

/**
 * Filter a single output chunk: strip exfiltration vectors and redact credentials.
 */
export function filterOutputChunk(chunk: string): string {
  let filtered = chunk;

  // Strip markdown images
  filtered = filtered.replace(MARKDOWN_IMAGE_RE, "");

  // Strip HTML img tags
  filtered = filtered.replace(HTML_IMG_RE, "");

  // Strip external markdown links (except docs.upsun.com)
  filtered = filtered.replace(EXTERNAL_LINK_RE, "");

  // Redact credentials
  for (const pattern of CREDENTIAL_PATTERNS) {
    filtered = filtered.replace(pattern, "[REDACTED]");
  }

  // Normalize excessive blank lines (collapse 3+ newlines to 2)
  filtered = filtered.replace(/\n{3,}/g, "\n\n");

  return filtered;
}

/**
 * Compute 4-gram overlap between response and system prompt.
 * Returns the overlap ratio (0-1).
 */
export function computeNgramOverlap(response: string, systemPrompt: string): number {
  const responseGrams = extractNgrams(response.toLowerCase(), 4);
  const promptGrams = extractNgrams(systemPrompt.toLowerCase(), 4);

  if (responseGrams.size === 0) return 0;

  let overlap = 0;
  for (const gram of responseGrams) {
    if (promptGrams.has(gram)) overlap++;
  }

  return overlap / responseGrams.size;
}

function extractNgrams(text: string, n: number): Set<string> {
  const words = text.split(/\s+/).filter(Boolean);
  const grams = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    grams.add(words.slice(i, i + n).join(" "));
  }
  return grams;
}
