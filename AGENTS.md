<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project: Agaseke for Organizations

A web app for nonprofits to manage memberships and collect donations.

### Stack
- Next.js 16.2.9 (App Router) with Turbopack — uses `proxy.ts` (not `middleware.ts`)
- Tailwind CSS v4 with `@import "tailwindcss"` syntax
- shadcn/ui base-nova (uses `@base-ui/react` — no `asChild` prop, no `cn` merge for variants)
- Firebase (Firestore, Auth, Storage) — project "ndafana-one"
- Zustand + React Query for state
- pawaPay for mobile money payments (hosted payment page flow)
- ImageKit for image uploads
- Sora font via `next/font/google` (weights 200–800), JetBrains Mono for mono
- Brand: #FF0000 (Agaseke red); mobile-first; dark mode via next-themes
- tiptap for rich text editing, @tailwindcss/typography for prose HTML rendering
- Google Analytics (GA4) via `next/script` gtag — measurement ID from `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- CURRENCY = USD (not RWF)
- Platform fee: 10% (payer configurable: org or donor)
- AES-GCM 256 + PBKDF2 for chat encryption
- **Email**: Resend (primary) + Nodemailer SMTP (fallback); orgs can configure their own SMTP; AES-GCM encrypted SMTP passwords
- **Cron**: 3 endpoints (reconcile, payment-reminders, membership-expiry) authorized via `CRON_SECRET`

### Architecture
- `(auth)/` route group — login, signup, forgot-password, verify-email
- `(legal)/` route group — Terms of Service, Privacy Policy (with PublicNav + PublicFooter)
- `org/[slug]/(admin)/` — dashboard, settings, campaigns, members, finance, rooms
- `org/[slug]/(member)/` — member-only rooms
- `org/[slug]/join/` — join flow with pawaPay checkout
- `org/[slug]/donate/` — donation flow with pawaPay checkout
- `org/[slug]/payment/return/[depositId]/[type]/` — payment return page (client-side verification)
- `org/[slug]/chat/` — public chat (guest-accessible)
- `app/api/payments/initiate/` — POST, initiates pawaPay payment page
- `app/api/payments/status/` — GET, checks pawaPay deposit status
- `app/api/payments/webhook/` — POST, pawaPay callback (verifies via API, delegates to shared `completeDeposit()`/`failDeposit()`)
- `app/api/payments/finalize/` — POST, client-side return verification (delegates to shared functions)
- `app/api/payments/reconcile/` — POST, manual reconcile via `CRON_SECRET` (delegates to `reconcilePendingTransaction()`)
- `app/api/cron/reconcile/` — GET/POST, cron-hittable pending transaction reconciliation with admin alerts
- `app/api/cron/payment-reminders/` — GET/POST, sends 3-day reminders for memberships and recurring donations
- `app/api/cron/membership-expiry/` — GET/POST, marks expired memberships and sends expiry notifications
- GA4 page view tracking via `GoogleAnalytics` component in root layout
- Campaign create/edit moved from modals to dedicated pages: `campaigns/new/`, `campaigns/[campaignId]/edit/`

### Key Patterns
- AuthGuard via client-side auth store (Firebase Auth uses indexedDB — middleware can't read it)
- Public org pages white-labeled (no Agaseke branding) with SignInModal for logged-out users
- Campaign `raisedAmount` updated atomically (`increment`) AND computed from donations — computed sum is authoritative
- pawaPay return URLs are path-based (`/org/{slug}/payment/return/{depositId}/{type}`) to avoid query param issues
- Fee breakdown hidden from public checkout UI
- Rich text content (org bio + campaign descriptions) stored as HTML, rendered via `RichTextContent` with Tailwind prose styles
- Campaign detail dialog on donate page — click info button to see full rich text description + progress
- Server-side Firestore writes via REST API + OAuth2 JWT assertion (in `lib/firebase/server.ts`)
- Google Analytics gtag loaded in root layout with Suspense boundary for `useSearchParams`
- **Shared payment logic**: `lib/payments.ts` — `completeDeposit()`, `failDeposit()`, `reconcilePendingTransaction()` — all routes delegate here (eliminated 4x duplication)
- **Email pipeline**: `lib/email/index.ts` → org SMTP → Resend → system SMTP fallback; org SMTP passwords encrypted with AES-GCM
- **Cron auth**: all 3 cron endpoints check `Authorization: Bearer {CRON_SECRET}` header
- **Campaign form**: `CampaignFormFields` extracted as reusable component; `CampaignForm` wraps in dialog for backward compat; dedicated pages for create/edit

### Server Helpers (lib/firebase/server.ts)
- `getAccessToken()` — RS256 JWT assertion → OAuth2 token
- `getAuthHeaders()` — returns `{ Authorization: Bearer <token> }` for Firestore REST calls
- `readFirestoreDocument(collection, docId, subcollection?, subDocId?)`
- `updateFirestoreDocument(collection, docId, data, subcollection?, subDocId?)`
- `queryFirestoreDocuments(collection, field, operator, value, limit?)`
- `incrementFirestoreField(collection, docId, field, amount, subcollection?, subDocId?)` — uses `doubleValue`
- `fetchOrgBySlug(slug)` — for server-side SEO metadata (uses `getAuthHeaders()`)

### Email Infrastructure (lib/email/)
- `index.ts` — `sendEmail(options, orgId?)` dispatcher; `getOrgAdmins(orgId)`; `getUserEmail(userId)`
- `providers/resend.ts` — Resend SDK wrapper
- `providers/smtp.ts` — Nodemailer singleton per config key
- `encrypt-smtp.ts` — AES-GCM encrypt/decrypt for SMTP passwords
- `templates/` — 8 templates: payment-confirmation, payment-failed, payment-reminder, membership-expiry, welcome, new-donation-notification, new-member-notification, pending-transaction-alert
- `payment-emails.ts` — shared email sending for donation/membership success and failure

### Shared Payment Logic (lib/payments.ts)
- `completeDeposit(depositId)` — marks transactions completed, processes donations (increments campaigns) and memberships (activates member), sends success emails
- `failDeposit(depositId, failureReason?)` — marks transactions failed, sends failure notifications
- `reconcilePendingTransaction(depositId)` — checks pawaPay status, delegates to complete/fail

### Env Vars Added
- `NEXT_PUBLIC_APP_URL` — dynamic base URL for all email links and return URLs
- `RESEND_API_KEY`, `DEFAULT_FROM_EMAIL`, `DEFAULT_FROM_NAME` — Resend email provider
- `SMTP_ENCRYPTION_KEY` — 32 bytes hex key for AES-GCM SMTP password encryption
- `SMTP_HOST/PORT/USER/PASS` — fallback SMTP provider
- `CRON_SECRET` — shared secret for cron job authorization

### Next Steps
1. Add `RESEND_API_KEY` to `.env.local` and register/verify sender domain in Resend
2. Configure cron-job.org with `CRON_SECRET` and app URL for the 3 cron endpoints
3. Add ImageKit keys to `.env.local` and test image upload
4. Test full payment flow: donate → pawaPay sandbox → webhook → email receipt → cron reconciliation
5. Add pawaPay production credentials and remove sandbox mode
