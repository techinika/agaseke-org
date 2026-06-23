# Agaseke for Organizations

A web application for nonprofits to manage memberships and collect donations.

Built with Next.js 16 (App Router), Firebase (Firestore, Auth, Storage), Tailwind CSS v4, shadcn/ui, Zustand, React Query, pawaPay, and ImageKit.

## Features

- **Membership management** — Create tiers with custom pricing, benefits, and billing cycles
- **Donation collection** — One-time and recurring donations with campaign tracking
- **Chat rooms** — Encrypted group chat for members, with public and private rooms
- **Mobile money payments** — Pay with MTN MoMo, Airtel Money, and other providers via pawaPay
- **Admin dashboard** — Revenue breakdown, member lists, campaign progress
- **Public organization pages** — White-labeled profile, join, and donate pages
- **Rich text content** — Org bios and campaign descriptions support images, video embeds, links, and formatted text via tiptap editor
- **Google Analytics** — GA4 page view tracking via measurement ID

## Getting Started

```bash
cp .env.example .env.local
# Fill in Firebase, pawaPay, and ImageKit credentials
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Environment Variables

- Firestore, Auth, and Admin SDK credentials (Firebase)
- `PAWAPAY_BASE_URL` / `PAWAPAY_API_TOKEN` — pawaPay payment processing
- `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` / `IMAGEKIT_PUBLIC_KEY` — ImageKit image uploads
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` — Google Analytics measurement ID (optional)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4, shadcn/ui (base-nova)
- **Backend**: Firebase (Firestore, Auth, Storage)
- **State**: Zustand, React Query
- **Payments**: pawaPay
- **Images**: ImageKit
- **Encryption**: AES-GCM 256
- **Rich text**: tiptap editor with @tailwindcss/typography
- **Analytics**: GA4 via next/script (gtag)

## Project Structure

```
app/
  (auth)/          — Login, signup, password reset
  (legal)/         — Terms of Service, Privacy Policy
  api/             — pawaPay payment routes
  org/[slug]/      — Organization-specific pages
    (admin)/       — Dashboard, settings, campaigns
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
  donations/       — Campaign forms, cards
lib/
  firebase/        — Client + Admin SDK, Firestore helpers
  pawapay.ts       — pawaPay API client
  imagekit.ts      — Image upload utilities
  encryption.ts    — AES-GCM 256 chat encryption
  constants.ts     — Collections, fee rates, types
types/             — TypeScript interfaces
hooks/             — React Query hooks, custom hooks
```
