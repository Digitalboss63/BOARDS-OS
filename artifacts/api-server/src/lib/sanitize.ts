/**
 * Redacts known secret patterns from log output and error messages.
 * Use this before any external-facing error string.
 */

const SECRET_PATTERNS = [
  /sk-ant-[a-zA-Z0-9\-_]{20,}/g,           // Anthropic keys
  /sk-[a-zA-Z0-9]{20,}/g,                   // OpenAI keys
  /postgresql:\/\/[^\s]+/g,                  // DB connection strings
  /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/g,        // Bearer tokens
  /password=[^&\s]*/gi,                      // URL passwords
];

export function redactSecrets(input: string): string {
  let out = input;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}

/**
 * Safe user-facing error string — never exposes internals.
 */
export function safeError(msg?: string): string {
  return msg ?? "An error occurred. Please try again.";
}

/**
 * Validation error — safe to return to client (Zod parse errors).
 * Strips internal schema details, returns only the first issue message.
 */
export function safeValidationError(zodError: { issues?: Array<{ message: string }> }): string {
  const first = zodError?.issues?.[0]?.message;
  return first ?? "Invalid request data.";
}
