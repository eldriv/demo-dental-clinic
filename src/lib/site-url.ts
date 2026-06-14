export function getSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
  ];

  for (const value of candidates) {
    if (value?.trim()) {
      return value.trim().replace(/\/$/, "");
    }
  }

  return "http://localhost:3000";
}
