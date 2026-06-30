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
- **Flutterwave** — single payment gateway for all payment methods (mobile money + cards)
- ImageKit for image uploads
- Sora font via `next/font/google` (weights 200–800), JetBrains Mono for mono
- Brand: #FF0000 (Quorum red); mobile-first; dark mode via next-themes
- Brand color applied as-is (hex directly on `--primary` CSS var — no OKLCH conversion); set via `BrandColorWrapper` on `document.documentElement` (not a wrapper div) so Dialog/Sheet portals inherit brand colors
- tiptap for rich text editing, @tailwindcss/typography for prose HTML rendering
- Google Analytics (GA4) via `next/script` gtag — measurement ID from `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- CURRENCY = USD (all amounts in USD, Flutterwave handles currency conversion)
- Platform fee: 10% (payer configurable: org or donor)
- AES-GCM 256 + PBKDF2 for chat encryption
- **Email**: Resend (primary) + Nodemailer SMTP (fallback); orgs can configure their own SMTP; AES-GCM encrypted SMTP passwords
- **Cron**: 3 endpoints (reconcile, payment-reminders, membership-expiry) authorized via `CRON_SECRET`

### Architecture
- `(auth)/` route group — login, signup, forgot-password, verify-email
- `(legal)/` route group — Terms of Service, Privacy Policy (with PublicNav + PublicFooter)
- `org/` — org listing page showing all orgs the user belongs to (with links to dashboard + public page)
- `org/create/` — create organization wizard (3 steps: basic info, category/location, logo)
- `org/[slug]/(admin)/` — dashboard, settings (brand color picker, category/country, encrypted SMTP), campaigns, members, finance, rooms
- `org/[slug]/(member)/` — member-only rooms
- `org/[slug]/join/` — join flow with Flutterwave checkout
- `org/[slug]/donate/` — donation flow with Flutterwave checkout
- `org/[slug]/payment/return/[depositId]/[type]/` — payment return page (client-side verification via Flutterwave)
- `admin/organizations/` — super admin page listing all organizations (requires `isAdmin: true` on user doc)
- `org/[slug]/chat/` — public chat (guest-accessible)
- `app/api/payments/initiate/` — POST, initiates Flutterwave payment link
- `app/api/payments/webhook/` — POST, Flutterwave webhook (verifies via HMAC, delegates to `completeDeposit()`/`failDeposit()`)
- `app/api/payments/finalize/` — POST, client-side return verification (delegates to shared functions)
- `app/api/payments/reconcile/` — POST, manual reconcile via `CRON_SECRET` (delegates to `reconcilePendingTransaction()`)
- `app/api/org/smtp/` — POST, encrypts SMTP password and saves to Firestore
- `app/api/cron/reconcile/` — GET/POST, cron-hittable pending transaction reconciliation with admin alerts
- `app/api/cron/payment-reminders/` — GET/POST, sends 3-day reminders for memberships and recurring donations
- `app/api/cron/membership-expiry/` — GET/POST, marks expired memberships and sends expiry notifications
- GA4 page view tracking via `GoogleAnalytics` component in root layout
- Campaign create/edit moved from modals to dedicated pages: `campaigns/new/`, `campaigns/[campaignId]/edit/`
- Tier create/edit moved from modals to dedicated pages: `members/tiers/new/`, `members/tiers/[tierId]/edit/`
- **Sidebar improvements**: Fixed toggle on all screens, "View public page" link, "All organizations" hidden from non-admins ✅

### Key Patterns
- AuthGuard via client-side auth store (Firebase Auth uses indexedDB — middleware can't read it)
- Public org pages white-labeled (no Quorum branding, solid `bg-background` on nav/footer — no gradients) with SignInModal for logged-out users; all public pages show `OrgNotFound` component when org doesn't exist
- Campaign `raisedAmount` updated atomically (`increment`) AND computed from donations — computed sum is authoritative
- Flutterwave return URLs are path-based (`/org/{slug}/payment/return/{depositId}/{type}`) to avoid query param issues
- Fee breakdown hidden from public checkout UI
- Rich text content (org bio + campaign descriptions) stored as HTML, rendered via `RichTextContent` with Tailwind prose styles
- Campaign detail dialog on donate page — click info button to see full rich text description + progress
- Server-side Firestore writes via REST API + OAuth2 JWT assertion (in `lib/firebase/server.ts`)
- Google Analytics gtag loaded in root layout with Suspense boundary for `useSearchParams`
- **Shared payment logic**: `lib/payments.ts` — `completeDeposit()`, `failDeposit()`, `reconcilePendingTransaction()` — all routes delegate here
- **Email pipeline**: `lib/email/index.ts` → org SMTP → Resend → system SMTP fallback; org SMTP passwords encrypted with AES-GCM
- **Cron auth**: all 3 cron endpoints check `Authorization: Bearer {CRON_SECRET}` header
- **Campaign form**: `CampaignFormFields` extracted as reusable component; `CampaignForm` wraps in dialog for backward compat; dedicated pages for create/edit
- **Super admin**: User docs with `isAdmin: true` can access `/admin/organizations` to view all orgs; accessible from sidebar
- **Firestore safety**: `useSendMessage` strips `undefined` values from data before `addDoc` to avoid Firestore rejecting undefined fields (e.g. `imageURL`)
- **tiptap**: StarterKit v3.27+ bundles `link` and `underline` — explicitly disabled in config since they're added separately
- **Sidebar**: Fixed on all screens, toggleable via hamburger/X button. Hamburger shown only when sidebar closed (at `left-3 top-3`), X button inside sidebar header when open. Content uses `AdminMainContent` client component for dynamic padding (`lg:pl-64` when open, `sm:pl-14` when closed to clear hamburger). Sidebar title is org name (not "Quorum") with `break-words`. "View public page" link opens org profile in new tab. "All organizations" link visible only to super admins.
- **Org listing**: `/org` page shows all orgs the user is an admin of, with card grid (avatar, description, country, category), "View page" (new tab) and "Dashboard" buttons, and a "New organization" button.
- **Login redirect**: Default redirect after login changed from `/org/create` to `/org` (shows org listing instead of forcing creation).
- **Org not-found**: Shared `OrgNotFound` component with configurable icon; server component uses `notFound()`, all public client pages render `OrgNotFound` when org is null (fixes blank pages, infinite spinners, and misleading error messages on checkout/payment pages).
- **Dashboard responsive**: Stat cards and Quick Actions grids use `auto-fill` with `minmax` for smooth responsive layout (cards wrap at 260px/240px) instead of fixed breakpoints.
- **Org logo as favicon**: Root layout metadata sets default `icons: '/favicon.svg'` (red "Q" on white). `BrandColorWrapper` overrides via DOM — sets `<link rel="icon">` to `org.logoURL` on mount, restores `/favicon.svg` on cleanup. Server profile page uses `generateMetadata` with `icons: org.logoURL` for initial server render.
- **Payment method selector**: `PaymentMethodSelector` component at `components/shared/payment-method-selector.tsx` — user picks between Mobile Money and Bank Card on checkout pages. Transaction `paymentMethod` field set to `'flutterwave_mobile_money'` or `'flutterwave_card'`. Initiation passes `payment_options` to Flutterwave API to filter available methods on hosted page.
- **Cover image overlay**: Public org profile hero adds `bg-black/50` overlay on top of cover image (only rendered when `org.coverURL` is set) to ensure org logo, name, and metadata remain readable against any cover image.
- **Tier form pages**: `TierFormFields` extracted as reusable component (same pattern as `CampaignFormFields`); `TierForm` dialog wrapper kept for backward compat; full-screen create/edit at `members/tiers/new/` and `members/tiers/[tierId]/edit/`.
- **Room back button**: Chat room dashboard shows "All rooms" button in toolbar (before edit/delete) when a room is selected on both mobile and desktop — always visible, not admin-only.
- **PWA support**: Web app manifest at `/manifest.webmanifest` (generated by `app/manifest.ts`) with standalone display, red theme color, SVG icons (192/512), and shortcuts. Service worker at `/sw.js` with cache-first strategy for static assets, network-first for pages, offline fallback, and push notification handlers. `PWARegister` client component handles SW registration and install prompt. Offline page at `/offline` with reconnection link.
- **Shared fee utility**: `lib/fees.ts` — `calculateFee(amount, feePayer)` returns `{ totalToPay, platformFee, orgReceives }`; eliminates duplicated fee math across checkout pages and tier form previews
- **Sonner customization**: Toaster configured with `richColors`, `top-right` position, larger text/padding, styled success/error/warning/info backgrounds for better visibility
- **Idempotency watermark**: Payment reminders cron tracks `lastReminderDate` per membership/donation doc to prevent duplicate reminder emails within the same day

### Logging (lib/logger.ts)
- Dual logger: console (synchronous) + Firestore `logs` collection (async, fire-and-forget)
- Levels: `error`, `warn`, `info`, `debug` — each maps to `console.error/warn/info/debug`
- Every log entry has: `timestamp`, `level`, `scope`, `message`, optional `data` (JSON-stringified)
- Firestore writes are best-effort (caught and suppressed on failure) — never blocks the caller
- Every API route uses a `correlationId` (`prefix_timestamp_random`) for tracing across logs
- Used in: all API routes, all server component pages, `lib/payments.ts`, `lib/flutterwave.ts`

### Server Helpers (lib/firebase/server.ts)
- `getAccessToken()` — RS256 JWT assertion → OAuth2 token
- `getAuthHeaders()` — returns `{ Authorization: Bearer <token> }` for Firestore REST calls
- `readFirestoreDocument(collection, docId, subcollection?, subDocId?)`
- `updateFirestoreDocument(collection, docId, data, subcollection?, subDocId?)`
- `createFirestoreDocument(collection, data)` — POST to auto-generate doc (used by logger)
- `queryFirestoreDocuments(collection, field, operator, value, limit?)`
- `incrementFirestoreField(collection, docId, field, amount, subcollection?, subDocId?)` — uses `doubleValue`
- `fetchOrgBySlug(slug)` — for server-side SEO metadata (uses `getAuthHeaders()`)

### Email Infrastructure (lib/email/)
- `index.ts` — `sendEmail(options, orgId?)` dispatcher; `getOrgAdmins(orgId)`; `getUserEmail(userId)`
- `providers/resend.ts` — Resend SDK wrapper
- `providers/smtp.ts` — Nodemailer singleton per config key
- `encrypt-smtp.ts` — AES-GCM encrypt/decrypt for SMTP passwords
- `templates/` — 7 templates: payment-confirmation, payment-failed, payment-reminder, membership-expiry, new-donation-notification, new-member-notification, pending-transaction-alert
- `payment-emails.ts` — shared email sending for donation/membership success and failure

### Shared Payment Logic (lib/payments.ts)
- `completeDeposit(depositId)` — marks transactions completed, processes donations (increments campaigns) and memberships (activates member), sends success emails. Re-reads transaction before updating to prevent concurrent processing race.
- `failDeposit(depositId, failureReason?)` — marks transactions failed, sets membership + member status to 'failed', sends failure notifications. Also re-reads before update.
- `reconcilePendingTransaction(depositId)` — checks Flutterwave transaction status, delegates to complete/fail
- `reReadTransaction(txId)` — fetches latest transaction state to guard against concurrent webhook + client-side finalize double-processing
- `safeSend(fn)` — wraps email sends in try-catch so failures are logged but don't cause data loss

### Flutterwave (lib/flutterwave.ts)
- `initiatePayment(params)` — POST `/v3/payments`, creates hosted payment link with `payment_options` (card/mobilemoneyrwanda)
- `verifyTransaction(tx_ref)` — GET `/v3/transactions/by_reference`, checks payment status
- `verifyWebhookHash(verifHash)` — constant-time comparison of `verif-hash` header against `FLUTTERWAVE_WEBHOOK_HASH`
- `generateDepositId()` — UUID v4 for `tx_ref`
- `getFlutterwavePaymentOptions(paymentMethod)` — maps 'mobile_money' → 'mobilemoneyrwanda', 'card' → 'card'
- `getReturnUrl(slug, depositId, type)` — builds path-based return URL
- Amounts passed in USD; Flutterwave handles currency conversion to local currencies

### Shared Fee Calculation (lib/fees.ts)
- `calculateFee(amount, feePayer)` — returns `{ totalToPay, platformFee, orgReceives }`
- Used by donate checkout, join checkout, and tier form preview
- Eliminates 3x duplication of fee math

### Env Vars
- `NEXT_PUBLIC_APP_URL` — dynamic base URL for all email links and return URLs
- `RESEND_API_KEY`, `DEFAULT_FROM_EMAIL`, `DEFAULT_FROM_NAME` — Resend email provider
- `SMTP_ENCRYPTION_KEY` — 32 bytes hex key for AES-GCM SMTP password encryption
- `SMTP_HOST/PORT/USER/PASS` — fallback SMTP provider
- `CRON_SECRET` — shared secret for cron job authorization
- `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` — ImageKit URL endpoint
- `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY` — ImageKit public key
- `IMAGEKIT_PRIVATE_KEY` — ImageKit private key
- `FLUTTERWAVE_SECRET_KEY` — Flutterwave secret key (server-side API auth)
- `FLUTTERWAVE_PUBLIC_KEY` — Flutterwave public key (for client-side)
- `FLUTTERWAVE_WEBHOOK_HASH` — Flutterwave webhook verify hash (HMAC-SHA256)
- `FLUTTERWAVE_BASE_URL` — Optional, defaults to `https://api.flutterwave.com`

### Key Patterns (cont.)
- **BrandColorWrapper on root**: Sets `--primary`/`--primary-foreground` CSS vars on `document.documentElement` via `useEffect` (not a wrapper div) so portal-rendered content (Dialog, Sheet) correctly inherits the org's brand color. Cleans up to defaults on unmount.
- **Landing page**: 8-section scrollable page (hero, problem/solution, how-it-works, features, audience cards, stats/reasons, FAQ, CTA) with PublicNav links to sections. PublicNav + MobileNav share a `navLinks` array. Dialog/Sheet overlays omit `backdrop-blur-sm` to avoid visual distraction.
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
- Added ARIA roles to payment-method-selector (`radiogroup`/`radio`/`aria-checked`) and `aria-expanded` to mobile-nav
- Fixed `as any` types in pwa-register (typed `BeforeInstallPromptEvent` interface)
- Added CORS headers to ImageKit auth route
- Removed unused imports from checkout pages
- Removed unused `isLoading` prop from finance-charts
- Extracted shared fee calculation into `lib/fees.ts`
- Customized Sonner toasts (richColors, larger, positioned top-right)
- Added idempotency watermark to payment reminders cron (`lastReminderDate` per doc)
- Fixed `unknown` type assertion in webhook route
- **Migrated from pawaPay + PesaPal to Flutterwave** — single gateway integration, removed 2 lib clients + 3 API routes, simplified finalize/reconcile/cron to single code path, updated checkout pages and docs
- **Fixed org name not showing server-side**: `fetchOrgBySlug` used unauthenticated `getHeaders()` — Firestore REST API rejected the request, returning `null`. Sidebar showed slug, metadata showed "Organization Not Found". Changed to `await getAuthHeaders()` and removed unused `getHeaders()`.
- **Fixed phantom auto-logout**: `onAuthStateChanged` fired `null` during transient token refresh failures. `AuthProvider` immediately called `reset()`, `AuthGuard` redirected to login before Firebase retried. Added 3s grace timer — if token recovers within window, user restored seamlessly.
- **Fixed SignInModal hidden behind overlay**: Dialog + Sheet rendered simultaneously, each with a backdrop. Content panels had responsive visibility classes but overlays didn't — Sheet overlay on desktop covered Dialog content. Added `overlayClassName` prop to `DialogContent`/`SheetContent`, passed matching responsive classes.
- **Fixed webhook race condition**: `completeDeposit`/`failDeposit` read stale `processedAt` data — concurrent webhook + client-side finalize could double-process (double campaign increment, double email). Added `reReadTransaction()` guard before each update.
- **Fixed email failure causing silent data loss**: If `sendDonationEmails`/`sendMembershipEmails` threw, exception propagated to webhook (500). Firestore writes already committed, retry skipped as already processed → emails lost forever. Wrapped all email sends in `safeSend()` that catches and logs errors.
- **Implemented `getFlutterwavePaymentOptions`** in `lib/flutterwave.ts` — maps `'mobile_money'` → `'mobilemoneyrwanda'`, `'card'` → `'card'` ✅
- **Implemented `PaymentMethodSelector` component** at `components/shared/payment-method-selector.tsx` with radio group ARIA, integrated into both checkout pages with state and API payload ✅
- **Created `(legal)/layout.tsx`** — deduplicates PublicNav/PublicFooter from privacy and terms pages ✅
- **Fixed `failDeposit` membership status gap** — now marks membership docs and member subcollection docs as `'failed'` (was only sending failure emails) ✅
- **Added `category`/`country` fields to settings page** with Select widgets, shared `CATEGORIES`/`COUNTRIES` constants extracted to `lib/constants.ts` ✅
- **Removed unused welcome email template** (not referenced anywhere) ✅

### Next Steps
1. Add `RESEND_API_KEY` to `.env.local` and register/verify sender domain in Resend
2. Configure cron-job.org with `CRON_SECRET` and app URL for the 3 cron endpoints
3. Add ImageKit keys to `.env.local` (all 3: URL endpoint, public key, private key) and test image upload
4. Add `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_PUBLIC_KEY`, and `FLUTTERWAVE_WEBHOOK_HASH` to `.env.local`
5. Test full payment flow: donate → Flutterwave sandbox → webhook → email receipt → cron reconciliation
6. Add Flutterwave production credentials
7. Test all public pages in incognito (logged-out) window after deployment
