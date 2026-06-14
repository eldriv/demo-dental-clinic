import { lorem, placeholders, site } from "@/content";
import { getSiteUrl } from "@/lib/site-url";

export function JsonLd() {
  const siteUrl = getSiteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: site.name,
    description: site.description,
    url: siteUrl,
    image: placeholders.og.src,
    logo: placeholders.logo.src,
    telephone: site.contact.phones[0],
    email: site.contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: lorem.contact.address,
      addressLocality: site.location.city,
      addressRegion: site.location.province,
      postalCode: "M6K 1L4",
      addressCountry: site.location.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.location.coordinates.lat,
      longitude: site.location.coordinates.lng,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "17:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "17:00",
      },
    ],
    sameAs: [site.contact.facebook],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: site.social.rating,
      reviewCount: site.social.reviewCount,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
