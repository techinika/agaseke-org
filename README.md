# Quorum for Organizations

A web application for nonprofits to manage memberships and collect donations.

Built with Next.js 16 (App Router), Firebase (Firestore, Auth, Storage), Tailwind CSS v4, shadcn/ui, Zustand, React Query, PesaPal, Cloudflare Workers, and Resend.

## Features

- **Landing page** — Full marketing site with problem/solution, how it works, audience targeting, FAQ, and CTAs
- **Pricing page** — Transparent pricing tiers (Starter/Growth/Enterprise) with feature comparison and FAQ
- **Membership management** — Create tiers with custom pricing, benefits, and billing cycles
- **Donation collection** — One-time and recurring donations with campaign tracking
- **Chat rooms** — Encrypted group chat for members, with public and private rooms
- **Card payments** — Pay with Visa, Mastercard, and other bank cards via PesaPal
- **Admin dashboard** — Revenue breakdown, member lists, campaign progress
- **Public organization pages** — White-labeled profile (with cover image overlay for readability), join, and donate pages
- **Rich text content** — Org bios and campaign descriptions support images, video embeds, links, and formatted text via tiptap editor
- **Google Analytics** — GA4 page view tracking via measurement ID
- **Email notifications** — Payment confirmations, reminders, expiry alerts, and failure notices via Resend API (branded) with Nodemailer SMTP fallback
- **Automated reconciliation** — Cron-driven pending transaction checks with admin email alerts
- **Progressive Web App** — Installable with offline support, push notifications, and home screen launch via web app manifest and service worker
- **Admin roles** — Super-admin, finance-admin, and community-admin roles with granular access control
- **Subscription plans** — Starter (free), Growth ($99/mo), Enterprise ($199/mo) with member limits and platform fees
- **Multi-month subscriptions** — 1–12 month billing with 10% discount for 5+ months
- **Withdrawals** — $10 minimum withdrawal with 5 working day processing
- **Org branding** — White-labeled emails with custom website, contact info, and footer text

## Pricing

| Plan | Monthly Fee | Transaction Fee | Members |
|------|-------------|-----------------|---------|
| Starter | Free | 10% | Up to 500 |
| Growth | $99 | 5% | 500–1,000 |
| Enterprise | $199 | 5% | 1,000+ |

All plans include white-labeled pages (logo, colors, custom URL), bank payout settings, and custom SMTP email.

## Getting Started

```bash
cp .env.example .env.local
# Fill in Firebase, PesaPal, Cloudflare Workers, and other credentials
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_*` | Yes | Firebase client SDK credentials |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Yes | Firebase Admin SDK service account email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Yes | Firebase Admin SDK private key |
| `PESAPAL_CONSUMER_KEY` | Yes | PesaPal consumer key |
| `PESAPAL_CONSUMER_SECRET` | Yes | PesaPal consumer secret |
| `PESAPAL_BASE_URL` | Yes | PesaPal API base URL (sandbox or production) |
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL (for email links and return URLs) |
| `QUORUM_PAYMENTS_URL` | Yes | quorum-payments worker URL |
| `QUORUM_PAYMENTS_API_KEY` | Yes | API key for quorum-payments worker |
| `NEXT_PUBLIC_QUORUM_UPLOADS_URL` | Yes | quorum-uploads worker URL |
| `QUORUM_CRON_URL` | Yes | quorum-cron worker URL |
| `QUORUM_COMM_URL` | Yes | quorum-comm worker URL |
| `QUORUM_COMM_API_KEY` | Yes | API key for quorum-comm worker |
| `QUORUM_SUBSCRIPTIONS_URL` | Yes | quorum-subscriptions worker URL |
| `QUORUM_SUBSCRIPTIONS_API_KEY` | Yes | API key for quorum-subscriptions worker |
| `CRON_SECRET` | Yes | Shared secret for cron job authorization |
| `SMTP_HOST/PORT/USER/PASS` | Fallback email | System SMTP provider (fallback) |
| `DEFAULT_FROM_EMAIL`, `DEFAULT_FROM_NAME` | Yes | Default email sender |
| `SMTP_ENCRYPTION_KEY` | For email | 32-byte hex key for org SMTP password encryption |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional | Google Analytics measurement ID |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4, shadcn/ui (base-nova)
- **Backend**: Firebase (Firestore, Auth, Storage)
- **State**: Zustand, React Query
- **Payments**: PesaPal API v3 (Cards only, USD)
- **Workers**: Cloudflare Workers (payments, uploads, cron, comm, subscriptions)
- **Storage**: Cloudflare R2 (`quorum-assets` bucket)
- **Email**: Resend API (branded), Nodemailer SMTP (fallback)
- **Encryption**: AES-GCM 256
- **Rich text**: tiptap editor with @tailwindcss/typography
- **Analytics**: GA4 via next/script (gtag)

## Project Structure

```
app/
  page.tsx         — Landing page (hero, features, how it works, audience cards, FAQ, CTA)
  (auth)/          — Login, signup, password reset
  (legal)/         — Terms of Service, Privacy Policy, Pricing
  admin/
    organizations/ — Super admin: list all organizations (requires isAdmin)
  api/
    org/           — smtp (encrypt and store SMTP credentials)
  org/             — User's organization listing (card grid with dashboard + public page links)
  org/create/      — Create organization wizard (3 steps)
  org/[slug]/
    (admin)/       — Dashboard, settings (brand color, category/country, encrypted SMTP, payout bank details, branding), campaigns (new/[campaignId]/edit), members (tiers/new/[tierId]/edit), finance, rooms, admins, subscription
    (member)/      — Chat rooms (with back button when room selected)
    join/          — Join flow with checkout
    donate/        — Donation flow with checkout
    chat/          — Public chat
    payment/       — Payment return/confirmation
components/
  shared/          — AuthGuard, AdminGuard, AdminMainContent, BrandColorWrapper, headers, footers, modals, RichTextEditor, RichTextContent, GoogleAnalytics
  ui/              — shadcn/ui primitives
  rooms/           — Chat components
  members/         — Tier forms, cards
  donations/       — Campaign forms, cards, campaign-form-fields
lib/
  firebase/        — Client + Admin SDK, Firestore helpers (server.ts has REST API helpers)
  email/           — Send dispatcher, SMTP providers, AES-GCM encrypt, email templates
  pesapal.ts       — PesaPal API client (token caching, initiate, verify, status mapping)
  workers.ts       — Centralized worker URL configuration
  fees.ts          — Shared calculateFee utility with plan-specific rates
  payments.ts      — Shared completeDeposit, failDeposit, reconcilePendingTransaction, reReadTransaction (race guard), safeSend (email failure safety)
  constants.ts     — Collections, fee rates, subscription plans, types
  app-url.ts       — Dynamic APP_URL helper
  encryption.ts    — AES-GCM 256 chat encryption
types/             — TypeScript interfaces
hooks/             — React Query hooks, custom hooks
workers/
  quorum-payments/ — PesaPal payment integration (initiate, webhook, finalize, reconcile)
  quorum-uploads/  — R2 file upload/serving
  quorum-cron/     — Scheduled tasks (reconcile, payment-reminders, membership-expiry, subscription-renewal, subscription-expiry)
  quorum-comm/     — Branded email sending via Resend API
  quorum-subscriptions/ — Multi-month subscription management, plan changes, renewal reminders, expiry
```
