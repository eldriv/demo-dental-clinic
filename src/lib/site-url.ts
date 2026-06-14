function normalizeUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function isLocalhostUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function getSiteUrl(): string {
  // Netlify injects URL automatically — prefer it in production.
  if (process.env.NETLIFY === "true" && process.env.URL?.trim()) {
    return normalizeUrl(process.env.URL);
  }

  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
  ]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];

  const productionUrl = candidates.find((value) => !isLocalhostUrl(value));
  if (productionUrl) {
    return normalizeUrl(productionUrl);
  }

  const fallback = candidates[0];
  if (fallback) {
    return normalizeUrl(fallback);
  }

  return "http://localhost:3000";
}
