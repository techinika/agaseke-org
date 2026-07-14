<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project: Quorum for Organizations

A web app for nonprofits to manage memberships and collect donations.

### Stack
- Next.js 16.2.9 (App Router) with Turbopack — uses `proxy.ts` (not `middleware.ts`)
- Tailwind CSS v4 with `@import "tailwindcss"` syntax
- shadcn/ui base-nova (uses `@base-ui/react` — no `asChild` prop, no `cn` merge for variants)
- Firebase (Firestore, Auth, Storage) — project "ndafana-one"
- Zustand + React Query for state
- **PesaPal API v3** — single payment gateway (Cards only, USD only)
- **Cloudflare Workers** — 4 workers: `quorum-payments`, `quorum-uploads`, `quorum-cron`, `quorum-comm`
- **Cloudflare R2** — `quorum-assets` bucket for image uploads (replaces ImageKit)
- Sora font via `next/font/google` (weights 200–800), JetBrains Mono for mono
- Brand: #FF0000 (Quorum red); mobile-first; dark mode via next-themes
- Brand color applied as-is (hex directly on `--primary` CSS var — no OKLCH conversion); set via `BrandColorWrapper` on `document.documentElement` (not a wrapper div) so Dialog/Sheet portals inherit brand colors
- tiptap for rich text editing, @tailwindcss/typography for prose HTML rendering
- Google Analytics (GA4) via `next/script` gtag — measurement ID from `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- CURRENCY = USD (all amounts in USD, PesaPal processes in USD)
- Platform fee: 10% for Starter (free), 5% for Growth ($99/mo) and Enterprise ($199/mo) plans (payer configurable: org or donor)
- Subscription plans: Starter (free, up to 500 members), Growth ($99/mo, 500–1,000 members), Enterprise ($199/mo, 1,000+ members)
- All plans include white-labeled pages (logo, colors, custom URL), bank payout settings, and custom SMTP email
- AES-GCM 256 + PBKDF2 for chat encryption
- **Email**: Cloudflare Email Service binding in `quorum-comm` worker (branded emails with org footer); Nodemailer SMTP fallback (org custom SMTP → system SMTP)
- **Cron**: `quorum-cron` Cloudflare Worker (reconcile, payment-reminders, membership-expiry) authorized via `CRON_SECRET`
- **Withdrawals**: $10 minimum, 5 working day processing

### Architecture
- `(auth)/` route group — login, signup, forgot-password, verify-email
- `(legal)/` route group — Terms of Service, Privacy Policy, Pricing (with PublicNav + PublicFooter)
- `org/` — org listing page showing all orgs the user belongs to (with links to dashboard + public page)
- `org/create/` — create organization wizard (3 steps: basic info, category/location, logo)
- `org/[slug]/(admin)/` — dashboard, settings (brand color, category/country, encrypted SMTP, payout bank details, branding), campaigns, members, finance, rooms, admins, subscription
- `org/[slug]/(member)/` — member-only rooms
- `org/[slug]/join/` — join flow with PesaPal card checkout (with member limit enforcement)
- `org/[slug]/donate/` — donation flow with PesaPal card checkout
- `org/[slug]/payment/return/[depositId]/[type]/` — payment return page (client-side verification via `quorum-payments` worker)
- `org/[slug]/admins/` — admin roles management (super-admin, finance-admin, community-admin)
- `org/[slug]/subscription/` — subscription plan management with PesaPal billing
- `org/[slug]/subscription/return/[orderId]/` — subscription payment return page (polls for processing state)
- `admin/organizations/` — super admin page listing all organizations (requires `isAdmin: true` on user doc)
- `org/[slug]/chat/` — public chat (guest-accessible)
- `app/api/org/smtp/` — POST, encrypts SMTP password and saves to Firestore
- `app/api/org/[slug]/subscription/` — GET/PATCH subscription plan with PesaPal billing
- GA4 page view tracking via `GoogleAnalytics` component in root layout
- Campaign create/edit moved from modals to dedicated pages: `campaigns/new/`, `campaigns/[campaignId]/edit/`
- Tier create/edit moved from modals to dedicated pages: `members/tiers/new/`, `members/tiers/[tierId]/edit/`
- **Sidebar improvements**: Fixed toggle on all screens, "View public page" link, "All organizations" hidden from non-admins ✅

### Cloudflare Workers (`workers/`)
- `workers/quorum-payments/` — PesaPal payment integration
  - `POST /initiate` — Creates PesaPal payment link (returns redirect URL)
  - `POST /webhook` — Receives PesaPal IPN notifications, processes payments
  - `POST /finalize` — Client-side return verification after PesaPal redirect
  - `POST /reconcile` — Cron: verifies all pending transactions via PesaPal
  - Auth: `X-API-Key` for initiate/finalize; `Authorization: Bearer {WEBHOOK_SECRET}` for webhook; `Authorization: Bearer {CRON_SECRET}` for reconcile
  - Webhook auth warns if `WEBHOOK_SECRET` unset (backwards-compatible migration)
  - Campaign `raisedAmount` incremented on successful donations; race condition skips already-processed txns
  - Bindings: `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_BASE_URL`, `FIREBASE_ADMIN_*`, `CRON_SECRET`, `WEBHOOK_SECRET`
  - CORS: restricted to `ALLOWED_ORIGIN` (set `ALLOWED_ORIGIN=https://yourdomain.com`)
- `workers/quorum-uploads/` — R2 image uploads
  - `POST /upload` — Multipart file upload to R2 bucket `quorum-assets` (auth required)
  - `GET /files/*` — Public file serving from R2
  - `DELETE /files/*` — File deletion from R2 (auth required)
  - Binding: `R2_BUCKET` (R2 bucket: `quorum-assets`)
  - CORS: restricted to `ALLOWED_ORIGIN`
- `workers/quorum-cron/` — Scheduled tasks
  - `GET|POST /reconcile` — Pending transaction reconciliation
  - `GET|POST /payment-reminders` — 3-day renewal reminders for memberships and recurring donations
  - `GET|POST /membership-expiry` — Marks expired memberships
  - Cron trigger: daily at 06:00 UTC
  - All endpoints auth: `Authorization: Bearer {CRON_SECRET}`
  - Email: Nodemailer via SMTP (logged in dev, sent in production)
- `workers/quorum-comm/` — Branded email sending via Cloudflare Email Service
  - `POST /send` — Generic email send (to, subject, html)
  - `POST /send-confirmation` — Payment confirmation email with org branding
  - `POST /send-failure` — Payment failure email with retry link
  - `POST /send-reminder` — Renewal reminder email
  - `POST /notify-admins` — Notify all org admins
  - `GET /health` — Health check
  - Auth: `X-API-Key` header
  - Binding: `send_email` (Cloudflare Email Service)
  - Templates: payment-confirmation, payment-failed, payment-reminder, new-donation-notification, new-member-notification
  - Org branding: website URL, contact email/phone, custom footer text in email footers

### Key Patterns
- AuthGuard via client-side auth store (Firebase Auth uses indexedDB — middleware can't read it)
- **Worker Firebase Auth**: `workers/shared/firebase-auth.ts` uses `jose` JWKS + JWT verification for verifying Firebase ID tokens in Cloudflare Workers
- **Proxy security headers**: `proxy.ts` adds X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy (no auth verification — Firebase Auth uses IndexedDB)
- **CORS on all workers**: All workers restrict CORS to `ALLOWED_ORIGIN` env var
- **Webhook auth**: PesaPal webhook uses `WEBHOOK_SECRET` Bearer token; warns if unset for backwards-compatible migration
- Public org pages white-labeled (no Quorum branding, solid `bg-background` on nav/footer — no gradients) with SignInModal for logged-out users; all public pages show `OrgNotFound` component when org doesn't exist
- Campaign `raisedAmount` updated atomically (`increment`) AND computed from donations — computed sum is authoritative
- PesaPal return URLs are path-based (`/org/{slug}/payment/return/{depositId}/{type}`) to avoid query param issues
- Fee breakdown hidden from public checkout UI
- Rich text content (org bio + campaign descriptions) stored as HTML, rendered via `RichTextContent` with Tailwind prose styles
- Campaign detail dialog on donate page — click info button to see full rich text description + progress
- Server-side Firestore writes via REST API + OAuth2 JWT assertion (in `lib/firebase/server.ts`)
- Google Analytics gtag loaded in root layout with Suspense boundary for `useSearchParams`
- **Shared payment logic**: `lib/payments.ts` — `completeDeposit()`, `failDeposit()`, `reconcilePendingTransaction()` — used by `quorum-payments` worker
- **Email pipeline**: `quorum-comm` worker for branded emails via Cloudflare Email Service; `lib/email/index.ts` for Nodemailer fallback (org SMTP → system SMTP); org SMTP passwords encrypted with AES-GCM
- **PesaPal client**: `lib/pesapal.ts` — token caching, payment initiation, transaction verification, status mapping
- **Worker URLs**: `lib/workers.ts` — centralized worker URL config from env vars (payments, uploads, cron, comm)
- **Campaign form**: `CampaignFormFields` extracted as reusable component; `CampaignForm` wraps in dialog for backward compat; dedicated pages for create/edit
- **Campaign auto-withdraw**: Each campaign has `withdrawalTrigger` field (`'anytime'` | `'target_reached'`) controlling when funds can be withdrawn
- **Withdrawal system**: $10 minimum, 5 working day processing. Finance and donations pages show available balance with "Request withdrawal" button. Withdrawals stored in `organizations/{orgId}/withdrawals` subcollection.
- **Admin roles**: Three roles — `super-admin` (full access), `finance-admin` (finance/donations/reports), `community-admin` (members/engagement). Managed via `/org/[slug]/admins/` page. Stored in `organizations/{orgId}/admins` subcollection.
- **Super admin**: User docs with `isAdmin: true` can access `/admin/organizations` to view all orgs; accessible from sidebar
- **Firestore safety**: `useSendMessage` strips `undefined` values from data before `addDoc` to avoid Firestore rejecting undefined fields (e.g. `imageURL`)
- **tiptap**: StarterKit v3.27+ bundles `link` and `underline` — explicitly disabled in config since they're added separately
- **Sidebar**: Fixed on all screens, toggleable via hamburger/X button. Hamburger shown only when sidebar closed (at `left-3 top-3`), X button inside sidebar header when open. Content uses `AdminMainContent` client component for dynamic padding (`lg:pl-64` when open, `sm:pl-14` when closed to clear hamburger). Sidebar title is org name (not "Quorum") with `break-words`. "View public page" link opens org profile in new tab. "All organizations" link visible only to super admins. Admins (UserCog icon) link for role management.
- **Org listing**: `/org` page shows all orgs the user is an admin of, with card grid (avatar, description, country, category), "View page" (new tab) and "Dashboard" buttons, and a "New organization" button.
- **Login redirect**: Default redirect after login changed from `/org/create` to `/org` (shows org listing instead of forcing creation).
- **Org not-found**: Shared `OrgNotFound` component with configurable icon; server component uses `notFound()`, all public client pages render `OrgNotFound` when org is null (fixes blank pages, infinite spinners, and misleading error messages on checkout/payment pages).
- **Dashboard responsive**: Stat cards and Quick Actions grids use `auto-fill` with `minmax` for smooth responsive layout (cards wrap at 260px/240px) instead of fixed breakpoints.
- **Org logo as favicon**: Root layout metadata sets default `icons: '/favicon.svg'` (red "Q" on white). `BrandColorWrapper` overrides via DOM — sets `<link rel="icon">` to `org.logoURL` on mount, restores `/favicon.svg` on cleanup. Server profile page uses `generateMetadata` with `icons: org.logoURL` for initial server render.
- **PWA icons**: All PWA icons (192, 512, maskable) show "Q" on red background, matching the favicon.
- **Card-only checkout**: No payment method selector — all payments are Cards via PesaPal. Transaction `paymentMethod` set to `'pesapal_card'`.
- **Cover image overlay**: Public org profile hero adds `bg-black/50` overlay on top of cover image (only rendered when `org.coverURL` is set) to ensure org logo, name, and metadata remain readable against any cover image.
- **Tier form pages**: `TierFormFields` extracted as reusable component (same pattern as `CampaignFormFields`); `TierForm` dialog wrapper kept for backward compat; full-screen create/edit at `members/tiers/new/` and `members/tiers/[tierId]/edit/`.
- **Room back button**: Chat room dashboard shows "All rooms" button in toolbar (before edit/delete) when a room is selected on both mobile and desktop — always visible, not admin-only.
- **PWA support**: Web app manifest at `/manifest.webmanifest` (generated by `app/manifest.ts`) with standalone display, red theme color, SVG icons (192/512), and shortcuts. Service worker at `/sw.js` with cache-first strategy for static assets, network-first for pages, offline fallback, and push notification handlers. `PWARegister` client component handles SW registration and install prompt. Offline page at `/offline` with reconnection link.
- **Shared fee utility**: `lib/fees.ts` — `calculateFee(amount, feePayer, plan)` returns `{ totalToPay, platformFee, orgReceives }`; eliminates duplicated fee math across checkout pages and tier form previews
- **Sonner customization**: Toaster configured with `richColors`, `top-right` position, larger text/padding, styled success/error/warning/info backgrounds for better visibility
- **Idempotency watermark**: Payment reminders cron tracks `lastReminderDate` per membership/donation doc to prevent duplicate reminder emails within the same day
- **Org payout settings**: Settings page includes bank details (bank name, account name, account number, SWIFT/BIC code, bank address) for receiving payouts. Saved to organization Firestore doc. Available on all subscription plans.
- **Org branding settings**: Settings page includes website URL, contact email, contact phone, and custom footer text for emails. Used by `quorum-comm` worker to add org branding to email footers.
- **R2 uploads**: Image uploads go through `quorum-uploads` worker to R2 bucket `quorum-assets`. Returns public URL at `quorum-assets.r2.dev/files/{folder}/{uuid}.{ext}`.
- **Member limit enforcement**: Join flow checks org's subscription plan member limit before allowing new memberships. Shows error toast if limit reached.
- **Subscription billing**: Subscription page allows upgrading/downgrading plans. Paid plans (Growth/Enterprise) initiate PesaPal payment via `quorum-payments` worker. Starter plan updates directly. Plan only upgraded on payment confirmation (not on initial PATCH).
- **Subscription return page**: `org/[slug]/subscription/return/[orderId]/` polls for payment processing state, shows success/failure UI with link back to subscription page.
- **Yearly billing**: Subscription page supports monthly/yearly toggle with 15% discount on yearly plans. `SubscriptionBillingCycle` type, `yearlyPrice` field in `SUBSCRIPTION_PRICING`.
- **Settings subscription card**: Settings page shows current subscription plan with link to manage subscription.

### Logging (lib/logger.ts)
- Dual logger: console (synchronous) + Firestore `logs` collection (async, fire-and-forget)
- Levels: `error`, `warn`, `info`, `debug` — each maps to `console.error/warn/info/debug`
- Every log entry has: `timestamp`, `level`, `scope`, `message`, optional `data` (JSON-stringified)
- Firestore writes are best-effort (caught and suppressed on failure) — never blocks the caller
- Every API route uses a `correlationId` (`prefix_timestamp_random`) for tracing across logs
- Used in: all server component pages, `lib/payments.ts`, `lib/pesapal.ts`

### Server Helpers (lib/firebase/server.ts)
- `getAccessToken()` — RS256 JWT assertion → OAuth2 token
- `getAuthHeaders()` — returns `{ Authorization: Bearer <token> }` for Firestore REST calls
- `readFirestoreDocument(collection, docId, subcollection?, subDocId?)`
- `updateFirestoreDocument(collection, docId, data, subcollection?, subDocId?)`
- `createFirestoreDocument(collection, data)` — POST to auto-generate doc (used by logger)
- `queryFirestoreDocuments(collection, field, operator, value, limit?)`
- `incrementFirestoreField(collection, docId, field, amount, subcollection?, subDocId?)` — uses `doubleValue`
- `fetchOrgBySlug(slug)` — for server-side SEO metadata (uses `getAuthHeaders()`)
- `fetchAllOrganizationSlugs()` — fetches all org slugs for sitemap generation (uses Firestore REST `runQuery`)

### Email Infrastructure (lib/email/)
- `index.ts` — `sendEmail(options, orgId?)` dispatcher (org SMTP → system SMTP fallback); `getOrgAdmins(orgId)`; `getUserEmail(userId)`; `getOrgBranding(orgId)` for footer data
- `providers/smtp.ts` — Nodemailer singleton per config key
- `encrypt-smtp.ts` — AES-GCM encrypt/decrypt for SMTP passwords
- `templates/` — 7 templates: payment-confirmation, payment-failed, payment-reminder, membership-expiry, new-donation-notification, new-member-notification, pending-transaction-alert
- `payment-emails.ts` — shared email sending for donation/membership success and failure (passes org branding to templates)
- All templates accept org branding options: `websiteUrl`, `contactEmail`, `contactPhone`, `footerText`

### Shared Payment Logic (lib/payments.ts)
- `completeDeposit(depositId)` — marks transactions completed, processes donations (increments campaigns) and memberships (activates member), sends success emails. Re-reads transaction before updating to prevent concurrent processing race.
- `failDeposit(depositId, failureReason?)` — marks transactions failed, sets membership + member status to 'failed', sends failure notifications. Also re-reads before update.
- `reconcilePendingTransaction(depositId)` — checks PesaPal transaction status, delegates to complete/fail
- `reReadTransaction(txId)` — fetches latest transaction state to guard against concurrent webhook + client-side finalize double-processing
- `safeSend(fn)` — wraps email sends in try-catch so failures are logged but don't cause data loss

### PesaPal (lib/pesapal.ts)
- `getPesapalToken()` — POST `/api/Auth/RequestToken`, caches JWT (5min expiry)
- `initiatePayment(params)` — POST `/api/Transactions/SubmitOrderRequest`, returns `{ redirect_url, order_tracking_id, merchant_reference }`
- `verifyTransaction(orderTrackingId)` — GET `/api/Transactions/GetTransactionStatus`
- `generateOrderId()` — UUID v4 (maps to depositId/merchant_reference)
- `getReturnUrl(slug, depositId, type)` — builds path-based return URL
- `mapPesapalStatus(statusCode, statusDescription)` — maps PesaPal status to `'completed'|'failed'|'pending'`
- Sandbox: `https://cybqa.pesapal.com/pesapalv3`, Production: `https://pay.pesapal.com/v3`
- All amounts in USD; PesaPal handles card processing

### Shared Fee Calculation (lib/fees.ts)
- `calculateFee(amount, feePayer, plan)` — returns `{ totalToPay, platformFee, orgReceives }` using plan-specific fee rate
- `getPlatformFeeRate(plan)` — returns the fee rate for a given subscription plan
- Used by donate checkout, join checkout, and tier form preview
- Eliminates 3x duplication of fee math

### Env Vars
- `NEXT_PUBLIC_APP_URL` — dynamic base URL for all email links and return URLs
- `PESAPAL_CONSUMER_KEY` — PesaPal consumer key
- `PESAPAL_CONSUMER_SECRET` — PesaPal consumer secret
- `PESAPAL_BASE_URL` — PesaPal API base URL (sandbox or production)
- `QUORUM_PAYMENTS_URL` — quorum-payments worker URL
- `QUORUM_PAYMENTS_API_KEY` — API key for quorum-payments worker
- `NEXT_PUBLIC_QUORUM_UPLOADS_URL` — quorum-uploads worker URL (public)
- `QUORUM_CRON_URL` — quorum-cron worker URL
- `QUORUM_COMM_URL` — quorum-comm worker URL
- `QUORUM_COMM_API_KEY` — API key for quorum-comm worker
- `SMTP_HOST/PORT/USER/PASS` — system SMTP provider (fallback)
- `DEFAULT_FROM_EMAIL`, `DEFAULT_FROM_NAME` — default email sender
- `SMTP_ENCRYPTION_KEY` — 32 bytes hex key for AES-GCM SMTP password encryption
- `CRON_SECRET` — shared secret for cron job authorization
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` — Google Analytics measurement ID
- `WEBHOOK_SECRET` — secret for PesaPal webhook Bearer token auth (warns if unset)
- `ALLOWED_ORIGIN` — CORS origin restriction for all workers (e.g. `https://yourdomain.com`)
- `WORKER_URL` — internal worker URL for quorum-payments (used by quorum-cron)

### Types
- `types/organization.ts` — Organization with subscription, SMTP, payout, and branding fields (websiteUrl, contactEmail, contactPhone, footerText)
- `types/campaign.ts` — Campaign with `withdrawalTrigger: WithdrawalTrigger` (`'anytime'` | `'target_reached'`)
- `types/withdrawal.ts` — Withdrawal with bank details, status (pending/processing/completed/failed), timestamps
- `types/admin.ts` — OrgAdmin with role (`super-admin` | `finance-admin` | `community-admin`)
- `types/tier.ts`, `types/membership.ts`, `types/transaction.ts`, `types/donation.ts`, `types/room.ts`

### Key Patterns (cont.)
- **BrandColorWrapper on root**: Sets `--primary`/`--primary-foreground` CSS vars on `document.documentElement` via `useEffect` (not a wrapper div) so portal-rendered content (Dialog, Sheet) correctly inherits the org's brand color. Cleans up to defaults on unmount.
- **Landing page**: 8-section scrollable page (hero, problem/solution, how-it-works, features, audience cards, stats/reasons, FAQ, CTA) with PublicNav links to sections. PublicNav + MobileNav share a `navLinks` array including Pricing link. Dialog/Sheet overlays omit `backdrop-blur-sm` to avoid visual distraction.
- **MobileNav accepts navLinks**: `MobileNav` now accepts an optional `navLinks` prop for dynamic navigation links alongside the fixed Log in / Get started buttons.
- **Auth-aware PublicNav**: `PublicNav` is now a client component that reads `useAuthStore` — shows avatar + dropdown (Organizations, Log out) when logged in, keeps Log in / Get started when logged out. `MobileNav` has matching auth-aware hamburger menu.
- **Mobile sticky bottom nav**: `MobileNav` renders a fixed bottom nav bar on mobile with Home, nav section links, and Orgs/Log in button. Landing page and legal layout add `pb-16 md:pb-0` to prevent content overlap.
- **Minimal org footer**: `PublicOrgFooter` shows only "Built with Quorum ❤" with muted background (`bg-muted/20`) for visual separation. Removed copyright, terms/privacy links, and promo bar.
- **Login/signup auto-redirect**: Both login and signup pages redirect to `/org` via `useEffect` when `useAuthStore` reports an already-authenticated user.

### Completed — Deep Codebase Analysis Fixes ✅
- Added missing `'use client'` directives (badge, chat-view, create-room-dialog)
- Removed unnecessary `'use client'` directives (rich-text-content, placeholder-page)
- Fixed stale state in settings page across org navigation (ref-based org ID diff replaces `initialized` flag)
- Fixed stale closure in chat-view decrypt effect (cancelled flag + ref for decrypted set)
- Fixed array index keys in tier-form-fields (stable UUID keys per benefit)
- Fixed `as any` types in pwa-register (typed `BeforeInstallPromptEvent` interface)
- Removed unused imports from checkout pages
- Removed unused `isLoading` prop from finance-charts
- Extracted shared fee calculation into `lib/fees.ts`
- Customized Sonner toasts (richColors, larger, positioned top-right)
- Added idempotency watermark to payment reminders cron (`lastReminderDate` per doc)
- **Migrated from Flutterwave to PesaPal** — single gateway, card-only, USD. Created `lib/pesapal.ts` with token caching, payment initiation, verification, status mapping.
- **Moved payments to Cloudflare Worker** — `quorum-payments` handles initiate, webhook, finalize, reconcile. Removed 4 Next.js API routes.
- **Moved uploads to Cloudflare R2** — `quorum-uploads` worker with `quorum-assets` bucket. Removed ImageKit entirely.
- **Moved cron to Cloudflare Worker** — `quorum-cron` handles reconcile, payment-reminders, membership-expiry with daily trigger. Removed 3 Next.js API routes.
- **Removed ImageKit** — all references, files, env vars, and `ik.imagekit.io` from `next.config.ts`
- **Removed Resend** — email now Nodemailer-only (org SMTP → system SMTP)
- **Removed mobile money** — payment method selector deleted, cards only
- **Added org payout settings** — bank name, account name, account number, SWIFT/BIC, bank address in settings page and Firestore
- **Created `(legal)/layout.tsx`** — deduplicates PublicNav/PublicFooter from privacy and terms pages ✅
- **Fixed `failDeposit` membership status gap** — now marks membership docs and member subcollection docs as `'failed'` (was only sending failure emails) ✅
- **Added `category`/`country` fields to settings page** with Select widgets, shared `CATEGORIES`/`COUNTRIES` constants extracted to `lib/constants.ts` ✅
- **Removed unused welcome email template** (not referenced anywhere) ✅
- **Added campaign auto-withdraw** — `withdrawalTrigger` field on campaigns (`'anytime'` | `'target_reached'`) ✅
- **Added withdrawal system** — $10 minimum, 5 working day processing. Finance + donations pages with request button. `types/withdrawal.ts`, `hooks/use-withdrawals.ts` ✅
- **Added admin roles** — super-admin, finance-admin, community-admin. `/org/[slug]/admins/` page with add/remove/role-change. `types/admin.ts`, `hooks/use-admins.ts` ✅
- **Added org branding** — website URL, contact email/phone, custom footer text in settings. Email templates use org branding in footers. ✅
- **Created quorum-comm worker** — Cloudflare Email Service binding for branded emails. 5 endpoints for sending various email types. ✅
- **Added subscription management UI** — Settings page shows current plan with link to subscription page. ✅
- **Added member limit enforcement** — Join flow checks plan member limit before allowing new memberships. ✅
- **Added PesaPal subscription billing** — Paid plans (Growth/Enterprise) initiate PesaPal payment. Starter updates directly. ✅
- **Fixed PWA icons** — All icons (192, 512, maskable) now show "Q" instead of "A". ✅
- **Yearly billing** — Monthly/yearly toggle with 15% discount. `SubscriptionBillingCycle` type. ✅
- **Subscription return page** — `org/[slug]/subscription/return/[orderId]/` with polling UI. ✅
- **Worker auth hardening** — `WEBHOOK_SECRET` for PesaPal webhook, CORS restricted on all workers, Firebase Auth via `jose` in workers. ✅
- **Proxy security headers** — X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy. ✅
- **SEO pages** — `not-found.tsx`, `error.tsx` (global + org), `robots.ts`, `sitemap.ts` with dynamic org pages. ✅
- **Landing page SEO** — `generateMetadata` with OpenGraph/Twitter tags. ✅
- **Email template branding** — payment-reminder, membership-expiry, pending-transaction-alert templates now pass org branding footer params. ✅
- **Type fixes** — `Transaction.processedAt/failureReason/billingCycle`, `Membership.amount`, `OrgMember.status` typed as `MembershipStatus`. ✅
- **Firestore REST fixes** — null values written as `{ nullValue: null }`, `incrementFirestoreField` uses `doubleValue` for decimals. ✅
- **Fee display fixes** — CampaignCard/TierCard accept `feeRate` prop instead of hardcoded 10%. ✅
- **Subscription API auth** — Route uses `verifyFirebaseToken` + admin check, deferred plan upgrade, ISO createdAt. ✅
- **Fixed `reconcilePendingTransaction`** — now fetches `orderTrackingId` from Firestore before calling `verifyTransaction` (was passing `depositId` as tracking ID) ✅
- **Fixed subscription API imports** — added `updateFirestoreDocument`, `createFirestoreDocument` imports (removed unused ones) ✅
- **Added worker secrets** — `QUORUM_COMM_URL`, `QUORUM_COMM_API_KEY` in `quorum-payments/wrangler.toml` ✅

### Next Steps
1. Deploy `quorum-comm` worker: `cd workers/quorum-comm && wrangler deploy`
2. Onboard email domain: `wrangler email sending enable yourdomain.com`
3. Deploy `quorum-payments` worker: `cd workers/quorum-payments && wrangler deploy`
4. Deploy `quorum-uploads` worker: `cd workers/quorum-uploads && wrangler deploy`
5. Deploy `quorum-cron` worker: `cd workers/quorum-cron && wrangler deploy`
6. Create R2 bucket `quorum-assets` via Cloudflare dashboard
7. Register IPN URL in PesaPal dashboard: `https://quorum-payments.<subdomain>.workers.dev/webhook`
8. Add PesaPal sandbox credentials to `.env.local`
9. Add worker URLs and API keys to `.env.local` (including `QUORUM_COMM_URL`, `QUORUM_COMM_API_KEY`)
10. Configure SMTP credentials for system email (fallback)
11. Test full payment flow: donate → PesaPal sandbox → webhook → email receipt → cron reconciliation
12. Test subscription flow: upgrade → PesaPal payment → plan update
13. Test withdrawal flow: request withdrawal → 5-day processing
14. Test admin roles: add admin → assign role → verify permissions
15. Add PesaPal production credentials
16. Test all public pages in incognito (logged-out) window after deployment
