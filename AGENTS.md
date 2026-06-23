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
- CURRENCY = USD (not RWF)
- Platform fee: 10% (payer configurable: org or donor)
- AES-GCM 256 + PBKDF2 for chat encryption

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
- `app/api/payments/webhook/` — POST, pawaPay callback (server-side, verifies via API, updates Firestore)

### Key Patterns
- AuthGuard via client-side auth store (Firebase Auth uses indexedDB — middleware can't read it)
- Public org pages white-labeled (no Agaseke branding) with SignInModal for logged-out users
- Campaign `raisedAmount` updated atomically (`increment`) AND computed from donations — computed sum is authoritative
- pawaPay return URLs are path-based (`/org/{slug}/payment/return/{depositId}/{type}`) to avoid query param issues
- Fee breakdown hidden from public checkout UI
- Rich text content (org bio + campaign descriptions) stored as HTML, rendered via `RichTextContent` with Tailwind prose styles
- Campaign detail dialog on donate page — click info button to see full rich text description + progress
- Server-side Firestore writes via REST API + OAuth2 JWT assertion (in `lib/firebase/server.ts`)

### Server Helpers (lib/firebase/server.ts)
- `getAccessToken()` — RS256 JWT assertion → OAuth2 token
- `readFirestoreDocument(collection, docId, subcollection?, subDocId?)`
- `updateFirestoreDocument(collection, docId, data, subcollection?, subDocId?)`
- `queryFirestoreDocuments(collection, field, operator, value, limit?)`
- `incrementFirestoreField(collection, docId, field, amount, subcollection?, subDocId?)`
- `fetchOrgBySlug(slug)` — for server-side SEO metadata

### Next Steps
1. Add ImageKit keys to `.env.local` and test image upload
2. Add pawaPay credentials and test payment flow end-to-end
3. Configure pawaPay callback URL to point at `https://agaseke.co/api/payments/webhook`
4. Set up automated reconciliation cycle for pending transactions (cron job or periodic check)
5. Test full user flow: browse org → donate → pawaPay redirect → return page → records updated
