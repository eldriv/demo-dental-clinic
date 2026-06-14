import type { Metadata } from "next";
import { placeholders, site } from "@/content";
import { getSiteUrl } from "./site-url";

interface PageMetadataOptions {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
}

export function createMetadata({
  title,
  description = site.description,
  path = "",
  noIndex = false,
}: PageMetadataOptions = {}): Metadata {
  const siteUrl = getSiteUrl();
  const pageTitle = title ? `${title} | ${site.name}` : site.name;
  const canonical = `${siteUrl}${path}`;

  return {
    title: pageTitle,
    description,
    metadataBase: new URL(siteUrl),
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "en_CA",
      url: canonical,
      siteName: site.name,
      title: pageTitle,
      description,
      images: [
        {
          url: placeholders.og.src,
          width: 1200,
          height: 630,
          alt: placeholders.og.label,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [placeholders.og.src],
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}
