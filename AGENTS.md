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
- **Cloudflare Workers** — 5 workers: `quorum-payments`, `quorum-uploads`, `quorum-cron`, `quorum-comm`, `quorum-subscriptions`
- **Cloudflare R2** — `quorum-assets` bucket for image uploads (replaces ImageKit)
- Sora font via `next/font/google` (weights 200–800), JetBrains Mono for mono
- Brand: #FF0000 (Quorum red); mobile-first; dark mode via next-themes
- Brand color applied as-is (hex directly on `--primary` CSS var — no OKLCH conversion); set via `BrandColorWrapper` on `document.documentElement` (not a wrapper div) so Dialog/Sheet portals inherit brand colors
- tiptap for rich text editing, @tailwindcss/typography for prose HTML rendering
- Google Analytics (GA4) via `next/script` gtag — measurement ID from `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- CURRENCY = USD (all amounts in USD, PesaPal processes in USD)
- Platform fee: 10% for Starter (free), 5% for Growth ($99/mo) and Enterprise ($199/mo) plans (payer configurable: org or donor)
- Subscription plans: Starter (free, up to 500 members), Growth ($99/mo, 500–1,000 members), Enterprise ($199/mo, 1,000+ members)
- Multi-month subscriptions: 1–12 months, 10% discount for 5+ months
- All plans include white-labeled pages (logo, colors, custom URL), bank payout settings, and custom SMTP email
- AES-GCM 256 + PBKDF2 for chat encryption
- **Email**: Resend API via `quorum-comm` worker (branded emails with org footer); Nodemailer SMTP fallback (org custom SMTP → system SMTP)
- **Subscriptions**: `quorum-subscriptions` worker handles multi-month billing, plan changes, renewal reminders, and expiry (verifies Firebase tokens directly via JWKS — no Next.js API route)
- **Cron**: `quorum-cron` Cloudflare Worker (reconcile, payment-reminders, membership-expiry, subscription-renewal, subscription-expiry) authorized via `CRON_SECRET`
- **Withdrawals**: $10 minimum, 5 working day processing

### Architecture
- `(auth)/` route group — login, signup, forgot-password, verify-email
- `(legal)/` route group — Terms of Service, Privacy Policy, Pricing (with PublicNav + PublicFooter)
- `org/` — org listing page showing all orgs the user belongs to (with links to dashboard + public page)
- `org/create/` — create organization wizard (3 steps: basic info, category/location, logo)
- `org/[slug]/(admin)/` — dashboard, settings (brand color, category/country, encrypted SMTP, payout bank details, branding), campaigns, members, finance, rooms, admins, subscription
- `org/[slug]/(admin)/members/add/` — manual member addition (name, email, tier, optional paid flag with transaction)
- `org/[slug]/(admin)/subscription/upgrade/` — dedicated upgrade/downgrade page with month selector and pricing cards
- `org/[slug]/(member)/` — member-only rooms
- `org/[slug]/join/` — join flow with PesaPal card checkout (with member limit enforcement)
- `org/[slug]/donate/` — donation flow with PesaPal card checkout
- `org/[slug]/payment/return/[depositId]/[type]/` — payment return page (client-side verification via `quorum-payments` worker)
- `org/[slug]/admins/` — admin roles management (super-admin, finance-admin, community-admin)
- `org/[slug]/subscription/` — subscription plan management with multi-month billing (calls `quorum-subscriptions` worker directly)
- `org/[slug]/subscription/return/[orderId]/` — subscription payment return page (polls `quorum-payments/finalize`)
- `admin/organizations/` — super admin page listing all organizations (requires `isAdmin: true` on user doc)
- `org/[slug]/chat/` — public chat (guest-accessible)
- `app/api/org/smtp/` — POST, encrypts SMTP password and saves to Firestore
- `app/api/org/[slug]/subscription/` — REMOVED (410 Gone). Subscription logic moved to `quorum-subscriptions` worker.
- GA4 page view tracking via `GoogleAnalytics` component in root layout
- Campaign create/edit moved from modals to dedicated pages: `campaigns/new/`, `campaigns/[campaignId]/edit/`
- Tier create/edit moved from modals to dedicated pages: `members/tiers/new/`, `members/tiers/[tierId]/edit/`

### Cloudflare Workers (`workers/`)
- `workers/quorum-payments/` — PesaPal payment integration
  - `POST /initiate` — Creates PesaPal payment link (returns redirect URL)
  - `POST /webhook` — Receives PesaPal IPN notifications, processes payments
  - `POST /finalize` — Client-side return verification after PesaPal redirect; calls `quorum-subscriptions/finalize` for subscription payments
  - `POST /reconcile` — Cron: verifies all pending transactions via PesaPal
  - Auth: `X-API-Key` for initiate/finalize; `Authorization: Bearer {CRON_SECRET}` for reconcile; IPN webhook is unauthenticated (PesaPal sends plain POST)
  - Campaign `raisedAmount` incremented on successful donations; race condition skips already-processed txns
  - Bindings: `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_BASE_URL`, `PESAPAL_IPN_URL_ID`, `FIREBASE_ADMIN_*`, `CRON_SECRET`, `QUORUM_SUBSCRIPTIONS_URL`, `API_KEY`
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
  - `GET|POST /subscription-renewal` — Calls `quorum-subscriptions/renewal-reminder`
  - `GET|POST /subscription-expiry` — Calls `quorum-subscriptions/expiry`
  - Cron trigger: daily at 06:00 UTC (runs all 5 tasks)
  - All endpoints auth: `Authorization: Bearer {CRON_SECRET}`
  - Bindings: `QUORUM_SUBSCRIPTIONS_URL`, `QUORUM_COMM_URL`, `API_KEY`, `CRON_SECRET`
- `workers/quorum-comm/` — Branded email sending via Resend API
  - `POST /send` — Generic email send (to, subject, html)
  - `POST /send-confirmation` — Payment confirmation email with org branding
  - `POST /send-failure` — Payment failure email with retry link
  - `POST /send-reminder` — Renewal reminder email
  - `POST /notify-admins` — Notify all org admins
  - `GET /health` — Health check
  - Auth: `X-API-Key` header
  - Email delivery: Resend API (`POST https://api.resend.com/emails` with Bearer token)
  - Secrets: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
  - Templates: payment-confirmation, payment-failed, payment-reminder, new-donation-notification, new-member-notification
  - Org branding: website URL, contact email/phone, custom footer text in email footers
- `workers/quorum-subscriptions/` — Multi-month subscription management
  - `GET /get-info` — Returns current subscription info (plan, dates, org details)
  - `GET /calculate-price` — Multi-month pricing with 10% discount for 5+ months
  - `POST /change-plan` — Initiates plan change (creates Firestore transaction, calls `quorum-payments/initiate`)
  - `POST /finalize` — Called by `quorum-payments` after payment confirmation; updates org subscription dates
  - `POST /handle-failure` — Called by `quorum-payments` on payment failure
  - `GET /renewal-reminder` — Cron: sends renewal reminder emails for upcoming expirations
  - `GET /expiry` — Cron: downgrades expired subscriptions and notifies admins
  - Auth: Firebase ID token (JWKS) for user-facing endpoints; `X-API-Key` for worker-to-worker calls
  - Pricing: `subtotal = monthlyRate × months`, 10% discount applied when `months >= 5`, max 12 months
  - Bindings: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `QUORUM_PAYMENTS_URL`, `QUORUM_COMM_URL`, `API_KEY`, `FIREBASE_ADMIN_*`
  - CORS: restricted to `ALLOWED_ORIGIN`

### Key Patterns
- AuthGuard via client-side auth store (Firebase Auth uses indexedDB — middleware can't read it)
- **Worker Firebase Auth**: `workers/shared/firebase-auth.ts` uses `jose` `importX509` + `jwtVerify` for verifying Firebase ID tokens in Cloudflare Workers. `quorum-subscriptions` has its own copy in `helpers.ts` (same jose-based approach, hardcodes `agaseke4org` project ID)
- **Proxy security headers**: `proxy.ts` adds X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy (no auth verification — Firebase Auth uses IndexedDB)
- **CORS on all workers**: All workers restrict CORS to `ALLOWED_ORIGIN` env var
- **Webhook auth**: PesaPal webhook is unauthenticated (plain POST); validates payload structure (OrderTrackingId, OrderMerchantReference required)
- Public org pages white-labeled (no Quorum branding, solid `bg-background` on nav/footer — no gradients) with SignInModal for logged-out users; all public pages show `OrgNotFound` component when org doesn't exist
- Campaign `raisedAmount` updated atomically (`increment`) AND computed from donations — computed sum is authoritative
- PesaPal return URLs are path-based (`/org/{slug}/payment/return/{depositId}/{type}`) to avoid query param issues
- Fee breakdown hidden from public checkout UI
- Rich text content (org bio + campaign descriptions) stored as HTML, rendered via `RichTextContent` with Tailwind prose styles
- Campaign detail dialog on donate page — click info button to see full rich text description + progress
- Server-side Firestore writes via REST API + OAuth2 JWT assertion (in `lib/firebase/server.ts`)
- Google Analytics gtag loaded in root layout with Suspense boundary for `useSearchParams`
- **Shared payment logic**: `lib/payments.ts` — `completeDeposit()`, `failDeposit()`, `reconcilePendingTransaction()` — used by `quorum-payments` worker
- **Email pipeline**: `quorum-comm` worker for branded emails via Resend API; `lib/email/index.ts` for Nodemailer fallback (org SMTP → system SMTP); org SMTP passwords encrypted with AES-GCM
- **PesaPal client**: `lib/pesapal.ts` — token caching, payment initiation, transaction verification, status mapping
- **Worker URLs**: `lib/workers.ts` — centralized worker URL config from env vars (payments, uploads, cron, comm, subscriptions)
- **Campaign form**: `CampaignFormFields` extracted as reusable component; `CampaignForm` wraps in dialog for backward compat; dedicated pages for create/edit
- **Campaign auto-withdraw**: Each campaign has `withdrawalTrigger` field (`'anytime'` | `'target_reached'`) controlling when funds can be withdrawn
- **Withdrawal system**: $10 minimum, 5 working day processing. Finance and donations pages show available balance with "Request withdrawal" button. Withdrawals stored in `organizations/{orgId}/withdrawals` subcollection.
- **Admin roles**: Three roles — `super-admin` (full access), `finance-admin` (finance/donations/reports), `community-admin` (members/engagement). Managed via `/org/[slug]/admins/` page. Stored in `organizations/{orgId}/admins` subcollection.
- **Super admin**: User docs with `isAdmin: true` can access `/admin/organizations` to view all orgs; accessible from sidebar
- **Firestore safety**: `useSendMessage` strips `undefined` values from data before `addDoc` to avoid Firestore rejecting undefined fields (e.g. `imageURL`)
- **tiptap**: StarterKit v3.27+ bundles `link` and `underline` — explicitly disabled in config since they're added separately
- **Sidebar**: Fixed on all screens, toggleable via hamburger/X button. Hamburger shown only when sidebar closed (at `left-3 top-3`), X button inside sidebar header when open. Content uses `AdminMainContent` client component for dynamic padding (`lg:pl-64` when open, `sm:pl-14` when closed to clear hamburger). Sidebar title is org name (not "Quorum") with `break-words`. "View public page" link opens org profile in new tab. "All organizations" link visible only to super admins. Admins (UserCog icon) link for role management. State persisted to `localStorage` (`quorum-sidebar-open`). Nav clicks only auto-close sidebar on mobile.
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
- **Multi-month subscription billing**: Subscription page supports 1–12 month selection. 10% discount for 5+ months. Frontend calls `quorum-subscriptions` worker directly (no Next.js API route). Starter plan downgrade handled inline.
- **Subscription return page**: `org/[slug]/subscription/return/[orderId]/` polls `quorum-payments/finalize`, shows success/failure UI with link back to subscription page.
- **Settings subscription card**: Settings page shows current subscription plan with link to manage subscription.
- **Settings form pre-fill**: Settings inputs use lazy `useState(() => org?.field ?? '')` initialization — form fields populate immediately from cached org data on mount.
- **Sidebar persistence**: Sidebar open/closed state persisted to `localStorage` (`quorum-sidebar-open`). Only closes on user action (X button, overlay click on mobile). Nav clicks only auto-close on mobile.

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
- `QUORUM_COMM_URL` — quorum-comm worker URL
- `QUORUM_SUBSCRIPTIONS_URL` — quorum-subscriptions worker URL
- `WORKER_API_KEY` — shared secret for worker auth (same value as `API_KEY` in all workers' wrangler.toml)
- `SMTP_HOST/PORT/USER/PASS` — system SMTP provider (fallback)
- `DEFAULT_FROM_EMAIL`, `DEFAULT_FROM_NAME` — default email sender
- `SMTP_ENCRYPTION_KEY` — 32 bytes hex key for AES-GCM SMTP password encryption
- `CRON_SECRET` — shared secret for cron job authorization
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` — Google Analytics measurement ID
- `WEBHOOK_SECRET` — removed (PesaPal IPN is unauthenticated plain POST)
- `ALLOWED_ORIGIN` — CORS origin restriction for all workers (e.g. `https://yourdomain.com`)
- `WORKER_URL` — internal worker URL for quorum-payments (used by quorum-cron)

### Types
- `types/organization.ts` — Organization with subscription, SMTP, payout, branding, and `subscriptionMonths` fields
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

### Completed ✅
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
- **Moved cron to Cloudflare Worker** — `quorum-cron` handles reconcile, payment-reminders, membership-expiry, subscription-renewal, subscription-expiry with daily trigger.
- **Removed ImageKit** — all references, files, env vars, and `ik.imagekit.io` from `next.config.ts`
- **Migrated quorum-comm from Cloudflare Email Service to Resend** — `sendViaResend()` via `POST https://api.resend.com/emails` with Bearer token auth. Removed `[[send_email]]` binding. Secrets: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
- **Removed mobile money** — payment method selector deleted, cards only
- **Added org payout settings** — bank name, account name, account number, SWIFT/BIC, bank address in settings page and Firestore
- **Created `(legal)/layout.tsx`** — deduplicates PublicNav/PublicFooter from privacy and terms pages
- **Fixed `failDeposit` membership status gap** — now marks membership docs and member subcollection docs as `'failed'` (was only sending failure emails)
- **Added `category`/`country` fields to settings page** with Select widgets, shared `CATEGORIES`/`COUNTRIES` constants extracted to `lib/constants.ts`
- **Removed unused welcome email template** (not referenced anywhere)
- **Added campaign auto-withdraw** — `withdrawalTrigger` field on campaigns (`'anytime'` | `'target_reached'`)
- **Added withdrawal system** — $10 minimum, 5 working day processing. Finance + donations pages with request button. `types/withdrawal.ts`, `hooks/use-withdrawals.ts`
- **Added admin roles** — super-admin, finance-admin, community-admin. `/org/[slug]/admins/` page with add/remove/role-change. `types/admin.ts`, `hooks/use-admins.ts`
- **Added org branding** — website URL, contact email/phone, custom footer text in settings. Email templates use org branding in footers.
- **Created quorum-comm worker** — Branded email sending via Resend API. 6 endpoints for sending various email types.
- **Created quorum-subscriptions worker** — Multi-month subscription management with Firebase token verification, 10% discount for 5+ months, plan changes, renewal reminders, and expiry handling.
- **Added subscription management UI** — Settings page shows current plan with link to subscription page.
- **Added member limit enforcement** — Join flow checks plan member limit before allowing new memberships.
- **Multi-month subscription billing** — Subscription page supports 1–12 month selection with live price breakdown. Frontend calls `quorum-subscriptions` worker directly.
- **Removed Next.js subscription API route** — Subscription logic fully handled by `quorum-subscriptions` worker (verifies Firebase tokens via JWKS directly).
- **Fixed PWA icons** — All icons (192, 512, maskable) now show "Q" instead of "A".
- **Worker auth hardening** — CORS restricted on all workers, Firebase Auth via `jose` in workers.
- **Proxy security headers** — X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy.
- **SEO pages** — `not-found.tsx`, `error.tsx` (global + org), `robots.ts`, `sitemap.ts` with dynamic org pages.
- **Landing page SEO** — `generateMetadata` with OpenGraph/Twitter tags.
- **Email template branding** — payment-reminder, membership-expiry, pending-transaction-alert templates now pass org branding footer params.
- **Type fixes** — `Transaction.processedAt/failureReason/billingCycle`, `Membership.amount`, `OrgMember.status` typed as `MembershipStatus`.
- **Firestore REST fixes** — null values written as `{ nullValue: null }`, `incrementFirestoreField` uses `doubleValue` for decimals.
- **Fee display fixes** — CampaignCard/TierCard accept `feeRate` prop instead of hardcoded 10%.
- **Fixed `reconcilePendingTransaction`** — now fetches `orderTrackingId` from Firestore before calling `verifyTransaction` (was passing `depositId` as tracking ID)
- **Added worker secrets** — `QUORUM_COMM_URL`, `QUORUM_SUBSCRIPTIONS_URL`, `API_KEY` (shared across all workers) in wrangler.toml files
- **Settings form pre-fill** — Lazy `useState(() => org?.field ?? '')` initialization so inputs populate immediately from cached org data.
- **Sidebar persistence** — Sidebar open/closed state persisted to `localStorage`. Nav clicks only auto-close sidebar on mobile (not desktop).
- **Lint cleanup** — Removed unused imports and variables across subscription page, quorum-comm, quorum-subscriptions, and lib/payments.
- **Upload worker auth fix** — All three frontend upload call sites (org create, settings, chat-view) now send `Authorization: Bearer <Firebase ID token>` (were missing auth headers entirely).
- **Shared firebase-auth.ts fix** — Changed `importPKCS8` → `importX509` (Google's cert endpoint returns X.509 certificates, not PKCS#8 private keys).
- **Subscriptions worker auth fix** — Replaced broken Web Crypto `verifyFirebaseToken` (passed full X.509 cert DER to `importKey('spki', ...)`) with jose's `importX509` (installed jose as dependency).
- **PEM base64 cleaning** — `pemToDer` now strips all non-base64 characters via `[^A-Za-z0-9+/=]` instead of just whitespace, handling `\n`, quotes, and other env-var artifacts.
- **Detailed error responses** — All catch blocks in `quorum-subscriptions` worker return the actual error message (not just a generic "Failed to ...").

### Next Steps
1. Deploy `quorum-comm` worker: `cd workers/quorum-comm && npm install && npm run deploy`
2. Set Resend secrets on `quorum-comm`: `wrangler secret put RESEND_API_KEY` and `wrangler secret put RESEND_FROM_EMAIL`
3. Deploy `quorum-subscriptions` worker: `cd workers/quorum-subscriptions && npm install && npm run deploy` (jose v6 added as dependency for Firebase token verification)
4. Set secrets on `quorum-subscriptions`: Firebase, PesaPal, Resend, worker API keys
5. Deploy `quorum-payments` worker: `cd workers/quorum-payments && npm install && npm run deploy`
6. Deploy `quorum-cron` worker: `cd workers/quorum-cron && npm install && npm run deploy`
7. Update `quorum-cron` wrangler.toml with deployed `QUORUM_SUBSCRIPTIONS_URL`
8. Create R2 bucket `quorum-assets` via Cloudflare dashboard
9. Register IPN URL in PesaPal dashboard: `https://quorum-payments.<subdomain>.workers.dev/webhook`
10. Add PesaPal sandbox credentials to `.env.local`
11. Add worker URLs and `WORKER_API_KEY` to `.env.local`
12. Configure SMTP credentials for system email (fallback)
13. Test full payment flow: donate → PesaPal sandbox → webhook → email receipt → cron reconciliation
14. Test subscription flow: upgrade → multi-month PesaPal payment → plan update → email confirmation
15. Test withdrawal flow: request withdrawal → 5-day processing
16. Test admin roles: add admin → assign role → verify permissions
17. Add PesaPal production credentials
18. Test all public pages in incognito (logged-out) window after deployment
