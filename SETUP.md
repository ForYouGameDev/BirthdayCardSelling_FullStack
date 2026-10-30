# Birthday Card Store — Batch 1 setup (Hinglish)

Batch 1 me kya hai: database (schema + RLS + storage), Google/email login, shop, product page with personalization, cart (guest + login merge).
Abhi NAHI hai (Batch 2+): checkout, Razorpay, orders, admin panel, coupons, invoices, analytics.

## 1. GitHub repo
1. github.com par naya repo banao (e.g. `birthday-cards`). Is zip ke andar ki files upload karo (`.github` folder ke saath).
2. `.env` kabhi upload mat karna.

## 2. Supabase (naya project)
1. supabase.com -> New project (free). Region: Mumbai.
2. SQL Editor me ye files **ek ek karke, is order me** run karo (copy-paste, Run):
   `supabase/migrations/0001_schema.sql` -> `0002_rls.sql` -> `0003_functions.sql` -> `0004_storage.sql` -> `supabase/seed.sql`
   (seed me 10 `[SAMPLE]` cards hain; live karne se pehle admin panel (Batch 2) se delete kar dena.)
3. Authentication -> Sign In / Providers: **Email** ON, **Google** ON (Client ID + Secret Google Cloud se; redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`).
4. Authentication -> URL Configuration:
   - Site URL: `https://<github-username>.github.io/<repo-name>/`
   - Redirect URLs: `https://<github-username>.github.io/<repo-name>/` , `https://<github-username>.github.io/<repo-name>/reset-password` , `http://localhost:5173/`
5. Project Settings -> API: Project URL aur **anon/publishable** key copy karo. (service_role key kabhi kahin mat daalna.)

## 3. GitHub Variables (Secrets nahi!)
Repo -> Settings -> Secrets and variables -> Actions -> **Variables** tab -> New repository variable:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_NAME`, `VITE_SITE_URL` (poori site URL), `VITE_CONTACT_EMAIL`.

## 4. Deploy
Settings -> Pages -> Source: **GitHub Actions**. Phir Actions tab me "Deploy to GitHub Pages" run hoga (main branch push par).

## 5. Admin banana
Pehle site par Google/email se ek baar login karo. Phir SQL Editor:
`update public.profiles set role = 'admin' where email = 'TUMHARA_EMAIL';`

## Local chalana
`cp .env.example .env` (values bharo) -> `npm install` -> `npm run dev`.
Tests: `npm test`.

## Honest verification status
- SQL (schema, RLS, storage policies, seed): real PostgreSQL 16 par test hua, 69 checks pass.
- Pricing/personalization/cart logic: 54 unit tests pass (ek simple runner se; asli `vitest` sandbox me install nahi ho paya).
- React code: sirf syntax-parse hua. `npm run build`, `tsc`, aur browser me chalana **verify nahi hua**. Pehli GitHub Actions run me agar typecheck/build error aaye to log bhejna, main fix kar dunga. (Typecheck step abhi non-blocking hai.)
- Google login, email confirm, GitHub Pages deploy: tumhare setup par hi verify honge.

## Batch 2 (admin panel, addresses, checkout, COD, Razorpay test)
1. Supabase SQL Editor: run `supabase/migrations/0005_batch2.sql` once.
2. COD works right away. Admin -> Settings: set shipping / COD fee.
3. Razorpay (test mode): get Test Key ID + Secret from dashboard.razorpay.com (Test mode).
   Supabase -> Edge Functions -> Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET (+ SUPABASE_ANON_KEY if missing).
   Deploy functions `razorpay-create-order`, `razorpay-verify`, `razorpay-webhook` (webhook with "Verify JWT" OFF) from `supabase/functions/`.
   Razorpay dashboard -> Webhooks -> URL `https://<ref>.supabase.co/functions/v1/razorpay-webhook`, events payment.captured + order.paid, same secret.
   Then Admin -> Settings -> tick "Allow online payment".
Verification: SQL 137 checks pass on real Postgres 16; 54+12 unit tests pass (shim runner). Edge Functions and Razorpay payment itself NOT run (no keys / Deno here).
