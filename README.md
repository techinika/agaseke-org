# Agaseke for Organizations

A web application for nonprofits to manage memberships and collect donations.

Built with Next.js 16 (App Router), Firebase (Firestore, Auth, Storage), Tailwind CSS v4, shadcn/ui, Zustand, React Query, pawaPay, ImageKit, and Resend.

## Features

- **Membership management** — Create tiers with custom pricing, benefits, and billing cycles
- **Donation collection** — One-time and recurring donations with campaign tracking
- **Chat rooms** — Encrypted group chat for members, with public and private rooms
- **Mobile money payments** — Pay with MTN MoMo, Airtel Money, and other providers via pawaPay
- **Admin dashboard** — Revenue breakdown, member lists, campaign progress
- **Public organization pages** — White-labeled profile, join, and donate pages
- **Rich text content** — Org bios and campaign descriptions support images, video embeds, links, and formatted text via tiptap editor
- **Google Analytics** — GA4 page view tracking via measurement ID
- **Email notifications** — Payment confirmations, reminders, expiry alerts, and failure notices via Resend or org-configured SMTP
- **Automated reconciliation** — Cron-driven pending transaction checks with admin email alerts

## Getting Started

```bash
cp .env.example .env.local
# Fill in Firebase, pawaPay, Resend, and other credentials
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
| `PAWAPAY_BASE_URL` | Yes | pawaPay API base URL (sandbox or production) |
| `PAWAPAY_API_TOKEN` | Yes | pawaPay API token |
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL (for email links and return URLs) |
| `CRON_SECRET` | Yes | Shared secret for cron job authorization |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | For uploads | ImageKit URL endpoint |
| `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY` | For uploads | ImageKit public key |
| `IMAGEKIT_PRIVATE_KEY` | For uploads | ImageKit private key |
| `RESEND_API_KEY` | For email | Resend API key |
| `SMTP_ENCRYPTION_KEY` | For email | 32-byte hex key for org SMTP password encryption |
| `SMTP_HOST/PORT/USER/PASS` | Fallback email | System SMTP fallback when Resend not configured |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional | Google Analytics measurement ID |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4, shadcn/ui (base-nova)
- **Backend**: Firebase (Firestore, Auth, Storage)
- **State**: Zustand, React Query
- **Payments**: pawaPay
- **Images**: ImageKit
- **Email**: Resend + Nodemailer SMTP
- **Encryption**: AES-GCM 256
- **Rich text**: tiptap editor with @tailwindcss/typography
- **Analytics**: GA4 via next/script (gtag)

## Project Structure

```
app/
  (auth)/          — Login, signup, password reset
  (legal)/         — Terms of Service, Privacy Policy
  api/
    payments/      — initiate, finalize, webhook, reconcile, status
    cron/          — reconcile, payment-reminders, membership-expiry
  org/[slug]/
    (admin)/       — Dashboard, settings, campaigns (new/[campaignId]/edit), members, finance, rooms
    (member)/      — Chat rooms
    join/          — Join flow with checkout
    donate/        — Donation flow with checkout
    chat/          — Public chat
    payment/       — Payment return/confirmation
components/
  shared/          — AuthGuard, headers, footers, modals, RichTextEditor, RichTextContent, GoogleAnalytics
  ui/              — shadcn/ui primitives
  rooms/           — Chat components
  members/         — Tier forms, cards
  donations/       — Campaign forms, cards, campaign-form-fields
lib/
  firebase/        — Client + Admin SDK, Firestore helpers (server.ts has REST API helpers)
  email/           — Send dispatcher, Resend/SMTP providers, AES-GCM encrypt, 8 email templates
  payments.ts      — Shared completeDeposit, failDeposit, reconcilePendingTransaction
  pawapay.ts       — pawaPay API client
  app-url.ts       — Dynamic APP_URL helper
  imagekit.ts      — Image upload utilities
  encryption.ts    — AES-GCM 256 chat encryption
  constants.ts     — Collections, fee rates, types
types/             — TypeScript interfaces
hooks/             — React Query hooks, custom hooks
```
