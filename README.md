# SmileCare Dental Clinic

A production-ready single-page marketing website with online booking, built with Next.js 16, React 19, Tailwind CSS 4, and designed for Netlify deployment.

## Features

- Polished dental clinic marketing site with 11 homepage sections
- Online appointment booking with email confirmations
- Patient self-service: view, reschedule, and cancel via `/manage/[token]`
- Optional Google Calendar integration
- Content-driven architecture — all copy in `src/content/`
- SEO: metadata, sitemap, robots.txt, JSON-LD LocalBusiness schema

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Customization

Edit business details, services, and section copy in `src/content/`. Replace placeholder images in `public/` and update `src/content/placeholders.ts` labels.

## Deployment

See [SETUP.md](./SETUP.md) for SMTP, Google Calendar OAuth, and Netlify deployment instructions.

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Netlify Blobs (production booking storage)
- Nodemailer + Gmail SMTP
- Google Calendar API (optional)
