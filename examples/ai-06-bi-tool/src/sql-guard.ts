const MAX_LIMIT = 500;

const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "REPLACE",
  "GRANT",
  "REVOKE",
  "CALL",
  "EXEC",
  "EXECUTE",
  "INTO OUTFILE",
  "INTO DUMPFILE",
  "LOAD_FILE",
  "LOAD DATA",
];

export function validateSQL(sql: string): { valid: boolean; error?: string; sanitized?: string } {
  const trimmed = sql.trim().replace(/;+$/, "").trim();

  if (!trimmed) {
    return { valid: false, error: "Empty query" };
  }

  // Must start with SELECT or WITH (for CTEs)
  const upper = trimmed.toUpperCase();
  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    return { valid: false, error: "Only SELECT queries are allowed" };
  }

  // Check for forbidden keywords (word boundary match)
  for (const keyword of FORBIDDEN_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`, "i");
    if (pattern.test(trimmed)) {
      return { valid: false, error: `Forbidden keyword: ${keyword}` };
    }
  }

  // No multiple statements (semicolons in the middle)
  if (trimmed.includes(";")) {
    return { valid: false, error: "Multiple statements are not allowed" };
  }

  // Enforce a LIMIT if none present
  let sanitized = trimmed;
  if (!/\bLIMIT\b/i.test(sanitized)) {
    sanitized = `${sanitized} LIMIT ${MAX_LIMIT}`;
  }

  return { valid: true, sanitized };
}
