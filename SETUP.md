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
| `CLINIC_TIMEZONE` | IANA timezone for slots (e.g. `Asia/Manila`) |
| `ADMIN_SECRET` | Long random string for signing admin sessions |
| `ADMIN_OWNER_EMAIL` | Owner login email (production; required with `ADMIN_PASSWORD`) |
| `ADMIN_STAFF_EMAIL` | Front desk login email (production; required with `ADMIN_PASSWORD_STAFF`) |
| `ADMIN_PASSWORD` | Owner dashboard password |
| `ADMIN_PASSWORD_STAFF` | Front desk dashboard password |

Admin login is rate-limited in production with escalating lockouts per IP: **1 min** after 3 failures, **2 min** after 5, **5 min** after 7, **1 hour** after 10 (within a rolling 1-hour window). In production, owner and staff must sign in with their **work email**, not short IDs like `owner` or `staff`.

## 2. Gmail SMTP Setup

1. Enable 2-Factor Authentication on your Google account.
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords).
3. Create an app password for "Mail".
4. Set `SMTP_USER` to your Gmail address and `SMTP_PASS` to the generated app password.

If SMTP is not configured, bookings still save but patients see a message to call the clinic phone number.

## 3. Local Development

Bookings are stored in `.data/bookings/bookings.json` during development. This directory is gitignored.

On first run, owner and staff accounts are seeded into `.data/bookings/admin-accounts.json` using `ADMIN_PASSWORD` and `ADMIN_PASSWORD_STAFF` (or local dev defaults). Dentist logins are **not** created from environment variables in production — the clinic owner invites each dentist from **Admin → Dentists**.

```bash
npm run dev
```

### Dentist accounts (invite-only)

1. Sign in as **owner**.
2. Open **Admin → Dentists**.
3. Add the dentist profile if needed.
4. Enter their email and click **Send invite**.
5. The dentist opens the email link, sets a password at `/admin/accept-invite`, then signs in at `/admin/login`.

Only the clinic owner can send or revoke dentist invites. Owner and front desk accounts use the passwords from environment variables. On Netlify, changing `ADMIN_PASSWORD` or `ADMIN_OWNER_EMAIL` and redeploying updates the stored login automatically.

## 4. Netlify Deployment

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

## 5. Customizing Content

All editable copy lives in `src/content/`:

| File | Contents |
|---|---|
| `site.ts` | Business name, contact, hours, location |
| `services.ts` | Full services list |
| `sections.ts` | Hero, about, team, testimonials, FAQ, etc. |
| `navigation.ts` | Nav and footer links |
| `placeholders.ts` | Image placeholder labels |

Replace `public/logo.png` and `public/og-image.png` with client assets. Update brand colors in `src/app/globals.css` `@theme inline` block.

## 6. Verify Build

```bash
npm run build
```

The build must complete with zero errors before deploying.
