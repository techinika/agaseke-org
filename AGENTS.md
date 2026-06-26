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
- PesaPal for card payments (hosted payment page flow via SubmitOrderRequest + IPN)
- ImageKit for image uploads
- Sora font via `next/font/google` (weights 200–800), JetBrains Mono for mono
- Brand: #FF0000 (Agaseke red); mobile-first; dark mode via next-themes
- Brand color applied as-is (hex directly on `--primary` CSS var — no OKLCH conversion)
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
- `org/` — org listing page showing all orgs the user belongs to (with links to dashboard + public page)
- `org/create/` — create organization wizard (3 steps: basic info, category/location, logo)
- `org/[slug]/(admin)/` — dashboard, settings (brand color picker + encrypted SMTP), campaigns, members, finance, rooms
- `org/[slug]/(member)/` — member-only rooms
- `org/[slug]/join/` — join flow with pawaPay or PesaPal checkout (user selects payment method)
- `org/[slug]/donate/` — donation flow with pawaPay or PesaPal checkout (user selects payment method)
- `org/[slug]/payment/return/[depositId]/[type]/` — payment return page (client-side verification, handles both pawaPay and PesaPal)
- `admin/organizations/` — super admin page listing all organizations (requires `isAdmin: true` on user doc)
- `org/[slug]/chat/` — public chat (guest-accessible)
- `app/api/payments/initiate/` — POST, initiates pawaPay payment page
- `app/api/payments/status/` — GET, checks pawaPay deposit status
- `app/api/payments/webhook/` — POST, pawaPay callback (verifies via API, delegates to shared `completeDeposit()`/`failDeposit()`)
- `app/api/payments/finalize/` — POST, client-side return verification (delegates to shared functions, supports both pawaPay and PesaPal)
- `app/api/payments/initiate-card/` — POST, initiates PesaPal payment page
- `app/api/payments/pesapal-ipn/` — POST, PesaPal IPN callback (verifies via API, delegates to shared `completeDeposit()`/`failDeposit()`)
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
- Public org pages white-labeled (no Agaseke branding, solid `bg-background` on nav/footer — no gradients) with SignInModal for logged-out users; all public pages show `OrgNotFound` component when org doesn't exist
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
- **Super admin**: User docs with `isAdmin: true` can access `/admin/organizations` to view all orgs; accessible from sidebar
- **Firestore safety**: `useSendMessage` strips `undefined` values from data before `addDoc` to avoid Firestore rejecting undefined fields (e.g. `imageURL`)
- **tiptap**: StarterKit v3.27+ bundles `link` and `underline` — explicitly disabled in config since they're added separately
- **Sidebar**: Fixed on all screens, toggleable via hamburger/X button. Hamburger shown only when sidebar closed (at `left-3 top-3`), X button inside sidebar header when open. Content uses `AdminMainContent` client component for dynamic padding (`lg:pl-64` when open, `sm:pl-14` when closed to clear hamburger). Sidebar title is org name (not "Agaseke4Org") with `break-words`. "View public page" link opens org profile in new tab. "All organizations" link visible only to super admins.
- **Org listing**: `/org` page shows all orgs the user is an admin of, with card grid (avatar, description, country, category), "View page" (new tab) and "Dashboard" buttons, and a "New organization" button.
- **Login redirect**: Default redirect after login changed from `/org/create` to `/org` (shows org listing instead of forcing creation).
- **Org not-found**: Shared `OrgNotFound` component with configurable icon; server component uses `notFound()`, all public client pages render `OrgNotFound` when org is null (fixes blank pages, infinite spinners, and misleading error messages on checkout/payment pages).
- **Dashboard responsive**: Stat cards and Quick Actions grids use `auto-fill` with `minmax` for smooth responsive layout (cards wrap at 260px/240px) instead of fixed breakpoints.
- **Org logo as favicon**: Root layout metadata sets default `icons: '/favicon.svg'` (red "A" on white). `BrandColorWrapper` overrides via DOM — sets `<link rel="icon">` to `org.logoURL` on mount, restores `/favicon.svg` on cleanup. Server profile page uses `generateMetadata` with `icons: org.logoURL` for initial server render.
- **PesaPal IPN**: If `PESAPAL_IPN_ID` is set in env, it's reused; otherwise `initiate-card` auto-registers a new one. IPN endpoint is `/api/payments/pesapal-ipn`. Uses `IPNCHANGE` notification type.
- **Payment method selector**: `PaymentMethodSelector` component on checkout pages — user picks between Mobile Money (pawaPay) and Bank Card (PesaPal). Transaction `paymentMethod` field set to `'pawapay'` or `'pesapal'`. Finalize/reconcile routes detect method and call the correct status API.
- **Cover image overlay**: Public org profile hero adds `bg-black/50` overlay on top of cover image (only rendered when `org.coverURL` is set) to ensure org logo, name, and metadata remain readable against any cover image.
- **Tier form pages**: `TierFormFields` extracted as reusable component (same pattern as `CampaignFormFields`); `TierForm` dialog wrapper kept for backward compat; full-screen create/edit at `members/tiers/new/` and `members/tiers/[tierId]/edit/`.
- **Room back button**: Chat room dashboard shows "All rooms" button in toolbar (before edit/delete) when a room is selected on both mobile and desktop — always visible, not admin-only.
- **PWA support**: Web app manifest at `/manifest.webmanifest` (generated by `app/manifest.ts`) with standalone display, red theme color, SVG icons (192/512), and shortcuts. Service worker at `/sw.js` with cache-first strategy for static assets, network-first for pages, offline fallback, and push notification handlers. `PWARegister` client component handles SW registration and install prompt. Offline page at `/offline` with reconnection link.

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
- `reconcilePendingTransaction(depositId, paymentMethod?)` — checks pawaPay or PesaPal status (detects by transaction field), delegates to complete/fail

### PesaPal (lib/pesapal.ts)
- `getAuthToken()` — obtains OAuth2 token from PesaPal
- `registerIpnUrl(url)` — registers IPN endpoint for async notifications
- `submitOrderRequest(params)` — initiates card payment order, returns `redirect_url` + `order_tracking_id`
- `getTransactionStatus(orderTrackingId)` — queries PesaPal for transaction status

### Env Vars Added
- `NEXT_PUBLIC_APP_URL` — dynamic base URL for all email links and return URLs
- `RESEND_API_KEY`, `DEFAULT_FROM_EMAIL`, `DEFAULT_FROM_NAME` — Resend email provider
- `SMTP_ENCRYPTION_KEY` — 32 bytes hex key for AES-GCM SMTP password encryption
- `SMTP_HOST/PORT/USER/PASS` — fallback SMTP provider
- `CRON_SECRET` — shared secret for cron job authorization
- `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` — ImageKit URL endpoint
- `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY` — ImageKit public key (was `IMAGEKIT_PUBLIC_KEY` — missing `NEXT_PUBLIC_` prefix)
- `IMAGEKIT_PRIVATE_KEY` — ImageKit private key
- `PESAPAL_URL`, `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_IPN_ID` — PesaPal card payments

### Next Steps
1. Add `RESEND_API_KEY` to `.env.local` and register/verify sender domain in Resend
2. Configure cron-job.org with `CRON_SECRET` and app URL for the 3 cron endpoints
3. Add ImageKit keys to `.env.local` (all 3: URL endpoint, public key, private key) and test image upload
4. Test full payment flow: donate → pawaPay sandbox → webhook → email receipt → cron reconciliation
5. Add PesaPal keys to `.env.local` and test card payment flow: donate → PesaPal sandbox → IPN → email receipt
6. Add pawaPay production credentials and remove sandbox mode
7. (complete — tier pages and room back button are done)
