# Setup Guide

## 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

### Required for production

| Variable | Description |
|---|---|
| `SITE_URL` | Canonical site URL (e.g. `https://yoursite.netlify.app`) |
| `NEXT_PUBLIC_SITE_URL` | Same as `SITE_URL`, exposed to client |
| `SMTP_HOST` | SMTP server (Gmail: `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (Gmail: `587`) |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail App Password (not your regular password) |
| `CLINIC_EMAIL` | Email address that receives booking notifications |

### Optional — Google Calendar

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `GOOGLE_REFRESH_TOKEN` | Long-lived refresh token |
| `GOOGLE_CALENDAR_ID` | Calendar ID (usually `primary`) |

## 2. Gmail SMTP Setup

1. Enable 2-Factor Authentication on your Google account.
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords).
3. Create an app password for "Mail".
4. Set `SMTP_USER` to your Gmail address and `SMTP_PASS` to the generated app password.

If SMTP is not configured, bookings still save but patients see a message to call the clinic phone number.

## 3. Google Calendar OAuth (Optional)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Calendar API**.
3. Create OAuth 2.0 credentials (Web application).
4. Add authorized redirect URI: `https://yoursite.netlify.app/api/auth/google/callback`
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your env.
6. Visit `/api/auth/google` in your browser to authorize.
7. Copy the refresh token displayed and set `GOOGLE_REFRESH_TOKEN`.

## 4. Local Development

Bookings are stored in `.data/bookings/bookings.json` during development. This directory is gitignored.

```bash
npm run dev
```

## 5. Netlify Deployment

1. Push your repo to GitHub/GitLab/Bitbucket.
2. In Netlify, create a new site from the repository.
3. Build settings are auto-detected from `netlify.toml`:
   - Build command: `npm run build`
   - Node version: 20
   - Plugin: `@netlify/plugin-nextjs`
4. Add all environment variables from `.env.example` in Netlify → Site settings → Environment variables.
5. Set `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to your Netlify URL (or custom domain).
6. Deploy.

### Netlify Blobs

Production bookings are stored in Netlify Blobs (store name: `bookings`). No additional configuration is needed — the `@netlify/blobs` SDK works automatically in the Netlify runtime.

## 6. Customizing Content

All editable copy lives in `src/content/`:

| File | Contents |
|---|---|
| `site.ts` | Business name, contact, hours, location |
| `services.ts` | Full services list |
| `sections.ts` | Hero, about, team, testimonials, FAQ, etc. |
| `navigation.ts` | Nav and footer links |
| `placeholders.ts` | Image placeholder labels |

Replace `public/logo.png` and `public/og-image.png` with client assets. Update brand colors in `src/app/globals.css` `@theme inline` block.

## 7. Verify Build

```bash
npm run build
```

The build must complete with zero errors before deploying.
