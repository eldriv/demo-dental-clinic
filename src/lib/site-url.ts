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

/** Use the domain the patient actually booked from (matches where data is stored). */
export function getSiteUrlFromRequest(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ?? request.headers.get("host") ?? "")
    .split(",")[0]
    ?.trim();

  if (host) {
    const [hostname, port] = host.split(":");
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return normalizeUrl(`http://${host}`);
    }
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return normalizeUrl(`${proto}://${host}`);
  }

  return getSiteUrl();
}

export function buildManageUrl(token: string, siteUrl?: string): string {
  const base = siteUrl ?? getSiteUrl();
  return `${base}/manage/${token}`;
}

export function buildConfirmUrl(token: string, siteUrl?: string): string {
  const base = siteUrl ?? getSiteUrl();
  return `${base}/api/bookings/${token}/confirm`;
}
