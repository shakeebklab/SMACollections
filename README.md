# TIME & STEP customer store

Original customer-only Next.js 16 App Router storefront for shoes and watches. No customer authentication and no admin dashboard. Reference video: `../video_ref/website_vidoe.mp4`; its design was used for inspiration only.

Repository: SMACollections

## Run locally

Use Node.js 22+ and npm. From this directory:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell use `Copy-Item .env.example .env.local` and `npm.cmd` if execution policy blocks npm.ps1. Open http://localhost:3000.

Without Supabase configuration, catalog browsing, product selection, cart and wishlist work with ten demonstration products. Orders, tracking and newsletter storage deliberately fail closed with a clear preview message. No pretend order success or browser-only inventory is used.

## Features and structure

- `src/app`: home, shop, category, product, wishlist, cart, checkout, private receipt, tracking, policies, loading/error states, metadata, sitemap and robots.
- `src/components`: original responsive dark/bronze storefront; watch/shoe carousel with pause and reduced-motion support; animated cards; shopping, guest checkout and tracking forms.
- `src/lib`: typed catalog, Zod validation, server-only Supabase client, quote calculation, request guards.
- `src/app/api`: quote, order, tracking and newsletter endpoints.
- `supabase/migrations`: schema, RLS, transactional checkout RPC, shared rate limiting and Storage bucket.
- `supabase/seed.sql`: 5 watches, 5 shoes, size variants, stock and product imagery.
- `public/images`: bundled illustrative Unsplash product photos. These are placeholders, not representations of owned inventory or brand partnerships; replace with your own licensed product photos before launch. Fictional names and brands are editable in seed/catalog data.
- `tests`: SQL security/inventory checks and desktop/mobile Playwright shopping-flow checks.

## Supabase setup

1. Create a Supabase project and retain its database password securely.
2. In SQL Editor run `supabase/migrations/202609120001_store.sql` once, followed by `supabase/seed.sql` for a demo store. Alternatively use the CLI commands below.
3. Copy the project URL and server service-role key from project API settings into `.env.local`. Never put the service-role key in a `NEXT_PUBLIC_` variable.
4. Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and set `ORDER_TOKEN_SECRET`. Keep it stable across instances; rotation invalidates existing receipt access.
5. Set `NEXT_PUBLIC_SITE_URL` to the exact origin, including http/https and port, and restart Next.js.
6. The migration creates the public `product-images` Storage bucket. Upload final product photographs using the separate authorized admin application or Supabase dashboard. Set product `primary_image` and `product_images.url` to their public URLs. Add any custom image host to `next.config.ts`.
7. Replace the demonstration inventory, contact information and draft policies before accepting real orders. The seed's relative `/images/` URLs work on this website; use absolute Storage URLs for assets shared with the separate admin application.

CLI alternative (Supabase CLI and Docker required for local Supabase):

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Run `supabase/seed.sql` in SQL Editor for the hosted demonstration data, or use `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql` with your private database connection string. Do not commit that string. For a disposable local database: `npx supabase start`, then `npx supabase db reset` (this resets local data). Regenerate seed from demo catalog with `npm run seed:generate`.

## Environment

| Variable | Purpose |
| --- | --- |
| NEXT_PUBLIC_SITE_URL | Exact public site origin; request-origin validation and SEO |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Server-only database credential |
| ORDER_TOKEN_SECRET | Random secret, minimum 32 characters |
| NEXT_PUBLIC_CONTACT_EMAIL | Published customer support email |
| NEXT_PUBLIC_WHATSAPP_NUMBER | WhatsApp number with country code, digits only |
| TRUST_PROXY_IP_HEADER | Optional header overwritten by your trusted reverse proxy |

On Vercel, the application uses the Vercel-injected IP header. On another platform, configure an overwritten, trusted IP header. Without one, the rate limit is shared across visitors; do not trust arbitrary client-supplied forwarding headers.

## Checkout security

The browser sends variant IDs and quantities, never authoritative prices. Zod validates Pakistan phone numbers, shipping fields and quantities. The server creates a fresh quote, verifies its fingerprint at submission, and the RPC recalculates totals while locking price and inventory rows. All inserts and stock changes occur in one transaction. Failed inventory changes roll back the order. An idempotency key prevents duplicate orders on retried submissions. Payment is cash_on_delivery / unpaid; initial order status is pending. Each item stores a purchase-time snapshot and creates a sale inventory movement.

All tables have RLS. Public access is restricted to the active catalog; order functions are service-role only. Tracking requires order number and normalized mobile number and returns a limited order summary. Receipts require a 24-hour HttpOnly, SameSite cookie tied to a hashed receipt token. Tracking and checkout use database-backed rate limits and same-origin JSON requests. No customer cancellation endpoint or automatic stock restoration is provided; the separate admin app must implement those safely.

Delivery is configured in `store_settings` under `delivery`, for example `{"default":250,"free_above":20000,"cities":{"karachi":200}}`. Use lowercase city keys. Update the shipping policy when changing fees. Cart totals are estimates until the server verifies the final delivery address and live stock.

## Validation

```sh
npm run lint
npm run typecheck
npm run test:db
npm run build
npm run start
# In another terminal, with the site on port 3000:
npm run test:e2e
```

Playwright defaults to installed Microsoft Edge. Change its channel or install Chromium if needed. SQL tests use PGlite, exercising the real migration and order function with mocked Supabase roles/storage tables. PGlite serializes operations; verify truly simultaneous transactions against a staging Supabase project before launch. Browser tests cover carousel, persistent cart/wishlist, shoe sizes, search, mobile overflow, and safely disabled unconfigured checkout. Hosted order, receipt and tracking integration requires your Supabase environment.

## Deploy

Import this repository into Vercel with `customer-store` as the root directory if importing the parent workspace. Use `npm run build`, set the environment variables above for the intended deployment, apply migrations, and deploy. Set the exact production origin before rebuilding. For another Node host run `npm ci`, `npm run build`, then `npm run start` behind an HTTPS reverse proxy. Do not use static export: checkout requires a server. Keep preview deployments on a separate database and origin.

Before launch, add real inventory/photos, approve shipping/returns/privacy/terms, configure support contacts and delivery fees, test a cash-on-delivery order and receipt/phone tracking on staging, and set up monitoring/backups. No live Supabase project was supplied during implementation, so hosted order placement has not been claimed as verified. Newsletter submission stores opt-ins; an email campaign/double-opt-in provider is not included. No fabricated customer endorsements or social accounts are published.
