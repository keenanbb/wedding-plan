# Bower "Trim and Ship" — Launch-Ready MVP Design

**Date:** 2026-03-28
**Status:** Approved
**Approach:** Approach 1 — Trim and Ship (minimal changes to what exists, get testable fast)

---

## 1. Product Direction

### Core Philosophy

- **No chatbot.** AI operates in the background only — email generation, not conversation.
- **Honest SaaS.** Transparent, fair, open-source ethos. Once paid, users get full control.
- **Do one thing well.** Find vendors, contact them on your behalf, track responses.

### User Flow (Revised)

```
1. Sign up (free)
2. Complete 5-step questionnaire (free)
3. See matched vendors with scores (free) ← value moment
4. Select vendors to contact
5. PAYWALL: "Send personalised emails to N vendors — $49"
6. Stripe Checkout → payment confirmed
7. AI generates personalised emails (background, Sonnet model)
8. Preview & edit emails before sending
9. Send batch → track delivery/opens/responses on dashboard
10. Import your own vendors if needed (paid feature)
```

---

## 2. What to Remove

| Item | Files | Reason |
|------|-------|--------|
| Chat page | `app/chat/page.tsx`, `app/chat/loading.tsx` | Redundant with questionnaire |
| Chat API route | `app/api/chat/route.ts` | AI chat endpoint no longer needed |
| ChatInterface component | `components/ChatInterface.tsx` | No longer used |
| Chat nav links | References in Header, landing page, dashboard | Dead paths |
| "Powered by Claude AI" branding | Footer badges, chat page | Background AI shouldn't be user-facing marketing |

### What NOT to remove
- `/app/api/outreach/generate-emails/route.ts` — this is the background AI email generation (keep)
- `/lib/email/generate-vendor-email.ts` — the actual AI email writer (keep)
- `/lib/rate-limit.ts` — rate limiting infrastructure (keep, repurpose for outreach routes)

---

## 3. What to Add

### 3.1 Stripe Checkout ($49 One-Time Payment)

**Model:** Single payment, not subscription. One-time $49 AUD unlocks all outreach features for the wedding.

**What paid unlocks:**
- AI email generation for matched vendors
- Batch email sending via Resend
- Response tracking dashboard (delivery, opens, replies)
- Custom vendor import (CSV / paste emails)
- Re-matching if preferences change

**What stays free:**
- Account creation
- Questionnaire completion
- Vendor matching and browsing
- Viewing vendor details, websites, ratings, scores

**Technical implementation:**
- Add `paidAt` (DateTime, nullable) field to `Wedding` model in Prisma schema
- Add `stripeSessionId` (String, nullable) field for payment reference
- Create `POST /api/checkout` — creates Stripe Checkout Session with `mode: 'payment'`
- Create `POST /api/webhooks/stripe` — handles `checkout.session.completed`, sets `paidAt` on the Wedding record
- Guard outreach API routes: check `wedding.paidAt !== null` before allowing email generation or sending
- Add upgrade prompt on the vendor matches page when user tries to send emails

**Stripe setup:**
- Single Stripe product: "Bower — Wedding Vendor Outreach"
- Price: $49.00 AUD, one-time
- Success URL: `/dashboard?payment=success`
- Cancel URL: `/vendors?payment=cancelled`

### 3.2 Vendor Import (Paid Users)

**Purpose:** Let paid users add vendors they've found themselves — respect their research, don't gatekeep.

**Implementation:**
- New page: `/vendors/import` (gated behind `paidAt` check)
- Two modes:
  1. **CSV upload** — columns: name, email, category, location, website (optional), phone (optional)
  2. **Manual add** — simple form: name + email + category (minimum viable)
- Imported vendors are linked to the user's wedding (not added to the global vendor DB)
- Imported vendors go through the same email generation + sending flow as matched vendors
- Validation: email format check, duplicate detection

### 3.3 Spam Act 2003 Compliance

Australian law requires:
- Clear identification of the sender (business name/ABN)
- Functional unsubscribe mechanism
- Accurate sender information

**Implementation:**
- Update email generation system prompt to include unsubscribe link in every email
- Add unsubscribe endpoint: `GET /api/unsubscribe?token=[vendor-outreach-id]`
- Include "Sent via Bower on behalf of [couple name]" footer
- Track unsubscribes in `VendorOutreach` table — never re-email unsubscribed vendors

---

## 4. What to Refine

### 4.1 Questionnaire

Already built and working. Minor refinements:
- Add "Newcastle" as an explicit location option (vendors exist for this region but it's not in the dropdown)
- Ensure the flow redirects correctly: questionnaire → vendor matches (not dashboard)

### 4.2 Landing Page

Update copy to reflect the actual product:
- Remove any AI chatbot references
- Focus on: "Find vendors → We contact them → Track responses"
- Clear free vs paid messaging

### 4.3 Dashboard

Already pulls real data from the database. Verify:
- Stats (contacted, delivered, opened, responded) are accurate
- Recent outreach activity displays correctly
- Empty states make sense for free users (no outreach yet) vs paid users (outreach in progress)

### 4.4 Email Generation

Keep the existing Sonnet-powered background generation. Refinements:
- Add unsubscribe link to system prompt output
- Add "Sent via Bower" footer
- Ensure couple can preview and edit every email before sending

### 4.5 Outreach Tracking

Existing Resend webhook integration tracks delivery events. Verify end-to-end:
- `RESEND_WEBHOOK_SECRET` must be set in Vercel for production
- Webhook processes: delivered, opened, bounced, complained events
- Dashboard reflects these states accurately

---

## 5. Vendor Data Bootstrap Strategy

### 5.1 Targets

| Region | Current | Target (MVP) |
|--------|---------|-------------|
| Sydney | 17 | 80-100 |
| Hunter Valley | 26 | 60-80 |
| Newcastle | 18 | 40-50 |
| South Coast | 14 | 40-50 |
| Blue Mountains | 12 | 30-40 |
| **Total** | **87** | **250-320** |

Focus on MVP 3 categories: **venues, photographers, caterers**. Florists/entertainment/marquee grow organically.

### 5.2 Bootstrap Pipeline

| Step | Tool | Data Yielded | Cost |
|------|------|-------------|------|
| 1. Core business data | **Outscraper** (Google Maps + email enrichment) | Name, address, phone, website, ratings, categories, email | $0-4 (free tier: 500 records) |
| 2. Wedding-specific data | **Easy Weddings** scraper (Playwright) | Capacity, price ranges, detailed categories | $0 (dev time) |
| 3. Email gap-fill | **Hunter.io** Domain Search | Emails for domains Outscraper missed | $0 (free tier: 50 credits) |
| 4. Email validation | **NeverBounce** or Hunter built-in | Verified deliverable emails | $0-3 |
| **Total** | | **All required fields** | **$0-10** |

**Why not Google Maps API directly?**
Google Places API does not return email addresses (confirmed — feature request closed by Google in 2016). Outscraper wraps Google Maps scraping and adds website email extraction in one step.

**Why Easy Weddings?**
4,000+ Australian wedding vendors with capacity and pricing data that Google Maps doesn't have. Richest AU-specific wedding data source.

### 5.3 Execution Waves

**Wave 1: Sydney + Hunter Valley** (biggest markets, most data available)
- Outscraper: ~15 search queries (3 categories x 5 sub-regions each)
- Easy Weddings scrape: Sydney + Hunter Valley venue/photographer/caterer pages
- Hunter.io gap-fill for missing emails
- Target: 80-100 Sydney, 60-80 Hunter Valley
- QA: Manual review of 20% sample, email validation
- Load into dev database for realistic testing

**Wave 2: Newcastle + South Coast**
- Same pipeline, refined from Wave 1 learnings
- Target: 40-50 each

**Wave 3: Blue Mountains + expansion**
- Target: 30-40 Blue Mountains
- Evaluate new regions based on demand

### 5.4 Dev vs Production Data

- Dev database gets all scraped data immediately (realistic testing environment)
- Production database only gets QA-verified vendors with validated emails
- Clear separation: dev can have 500+ vendors, production starts with verified subset

### 5.5 Bootstrap Tooling

Single script: `/scripts/bootstrap-vendors.ts`

```
Responsibilities:
1. Read Outscraper JSON export
2. Merge Easy Weddings data (matched by business name + location)
3. Flag missing emails for Hunter.io lookup
4. Output vendor-import-[region].json for human review
5. --import flag loads reviewed JSON into Prisma database
6. --validate flag runs email validation before import
7. Deduplication against existing vendors in DB
```

### 5.6 Legal Compliance (Australia)

- Use business contact emails only (info@, hello@, bookings@) — not personal emails
- Include vendor opt-out mechanism in the platform
- Privacy policy explains data sources
- Respect robots.txt on wedding directories
- Store only factual business data — do not copy descriptions or reviews verbatim from scraped sources
- Generate original descriptions via the existing vendor data schema

---

## 6. Environment & Infrastructure

### Missing Vercel Env Vars

| Variable | Purpose | Priority |
|----------|---------|----------|
| `RESEND_WEBHOOK_SECRET` | Verify webhook delivery events are real | High — required for tracking |
| `STRIPE_SECRET_KEY` | Stripe payment processing | High — required for paywall |
| `STRIPE_WEBHOOK_SECRET` | Verify Stripe webhook events | High — required for payment confirmation |
| `STRIPE_PRICE_ID` | The $49 AUD price ID | High — required for checkout |
| `UPSTASH_REDIS_REST_URL` | Rate limiting in production | Medium — falls back to in-memory |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting auth | Medium — falls back to in-memory |
| `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring | Low — app works without it |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Sentry source maps | Low — debugging convenience |

### New Dependencies

- `stripe` — Stripe Node.js SDK for checkout + webhooks
- `papaparse` or `csv-parse` — CSV parsing for vendor import (evaluate at implementation time)

---

## 7. Out of Scope (Deferred)

These are explicitly not part of this design. They become candidates after real user testing:

- Quote comparison tool (build when vendors start responding)
- Budget tracker (build when users ask for it)
- Agentic AI chat (killed — background AI only)
- Vendor self-service portal (premature without traction)
- Mobile app (responsive web covers this)
- RSVP / guest list management (separate product concern)
- Dark mode toggle (editorial design works in current theme)
- Interactive vendor map (nice-to-have, not core flow)

---

## 8. Success Criteria

This design is successful when:

1. A real user can sign up, complete the questionnaire, see matched vendors, pay $49, and receive personalised vendor emails — end to end
2. Dev environment has 250+ vendors for realistic testing
3. Email deliverability is verified (emails land in inboxes, not spam)
4. Stripe payment flow works in test and production
5. Vendor response tracking reflects real webhook events
6. At least 2 regions (Sydney + Hunter Valley) have sufficient vendor coverage for useful matching
