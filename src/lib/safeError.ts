const KNOWN_ERROR_NAMES = new Set([
  "Error", "TypeError", "SyntaxError", "AbortError", "TimeoutError",
  "APIError", "APIConnectionError", "APIConnectionTimeoutError", "AuthenticationError",
  "PermissionDeniedError", "RateLimitError", "BadRequestError", "NotFoundError",
  "UnprocessableEntityError", "InternalServerError",
  "PrismaClientKnownRequestError", "PrismaClientUnknownRequestError",
  "PrismaClientInitializationError", "PrismaClientValidationError",
]);

/** Provider errors may contain keys, headers, URLs, prompts, and response bodies. */
export function safeErrorDetails(error: unknown): { kind: string; status?: number } {
  const kind = error instanceof Error && KNOWN_ERROR_NAMES.has(error.name) ? error.name : "UnknownError";
  const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
  return typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599
    ? { kind, status }
    : { kind };
}
