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

### Scaffold a new clinic project (one command)

**Interactive** — run and answer the prompts:

```bash
make clinic
```

You'll be asked for clinic name, city, address, phone, email, brand colors, and output folder. It saves `configs/<slug>.json`, then creates `~/dev/<folder>/`.

Non-interactive (use an existing config):

```bash
make clinic NAME=bright-smile
```

Start the dev server right after scaffold:

```bash
make clinic DEV=1
```

Preview the output path without creating files:

```bash
make print-out NAME=bright-smile
```

See `configs/README.md` and `templates/clinic.config.example.json` for all config fields.

### Regenerate this template repo only

```bash
make generate CONFIG=configs/my-clinic.json
# or: npm run generate -- --config configs/my-clinic.json
```

The generator writes `src/content/site.ts`, `lorem.ts`, `sections.ts`, `services.ts`, `admin.ts`, patches theme colors in `globals.css`, updates `package.json` name, and regenerates `public/logo.png` + `public/og-image.png`.

See `configs/README.md` and `templates/clinic.config.example.json` for all config fields.

## Deployment

See [SETUP.md](./SETUP.md) for SMTP, Google Calendar OAuth, and Netlify deployment instructions.

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Netlify Blobs (production booking storage)
- Nodemailer + Gmail SMTP
- Google Calendar API (optional)
