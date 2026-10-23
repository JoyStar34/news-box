/** Public metadata is deliberately independent of database and AI configuration. */
export function getSiteUrl(value = process.env.NEXT_PUBLIC_SITE_URL): URL {
  const configured = value?.trim() || "http://localhost:3000";
  try {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
      throw new Error("Invalid origin");
    }
    return url;
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without credentials, path, query, or fragment.");
  }
}

export function getPlausibleDomain(
  enabled = process.env.NEXT_PUBLIC_ENABLE_PLAUSIBLE,
  domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
): string | null {
  if (enabled !== "true") return null;
  const normalized = domain?.trim().toLowerCase();
  // One explicit hostname only; never send fork users' visits to the original deployment.
  if (!normalized || normalized.length > 253 || !/^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?$/.test(normalized) ||
    normalized.split(".").some((label) => !label || label.length > 63 || label.startsWith("-") || label.endsWith("-"))) {
    return null;
  }
  return normalized;
}
