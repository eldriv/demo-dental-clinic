#!/usr/bin/env bash
# Clear all Netlify Blobs data for this app (production).
# Prerequisites: netlify login && netlify link (run once from project root)

set -euo pipefail

NETLIFY=(npx -y netlify)

keys=(all-bookings schedule-blocks clinic-settings dentists)

echo "Clearing Netlify Blobs store: bookings"
for key in "${keys[@]}"; do
  echo "  deleting ${key}..."
  "${NETLIFY[@]}" blobs:delete bookings "$key" --force
done

echo "Done. Production bookings, hours, dentists, and blocks are reset."
