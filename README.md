# StreamWedding 💍

AI-powered wedding planning assistant that automates vendor discovery and outreach for couples planning weddings in New South Wales, Australia.

## 🎯 What We're Building

An intelligent wedding planning platform that:

- **Multi-Step Form Intake**: Professional questionnaire to gather wedding requirements
- **Smart Vendor Matching**: Automatically finds venues, photographers, caterers based on your preferences
- **Automated Outreach**: Sends personalized emails to vendors on your behalf
- **Response Dashboard**: Aggregates vendor responses for easy comparison
- **Edit Anytime**: Update your wedding details whenever needed

## 🚀 Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth (@supabase/ssr) - email/password, Google OAuth, magic links, password reset
- **AI**: Claude (Anthropic SDK) for vendor email generation and matching
- **Email**: Resend API (batch sending, webhook delivery tracking)
- **Rate Limiting**: Upstash Redis (with in-memory dev fallback)
- **Error Monitoring**: Sentry (@sentry/nextjs v10)
- **Hosting**: Vercel
- **Testing**: Vitest (121 unit tests) + Playwright (16 E2E tests)
- **Linting**: ESLint + Prettier + auto-formatting

## 📋 Project Status

**Current Phase**: Production Ready ✅

**Completed Features:**
- ✅ **Authentication** (Supabase Auth — email/password, Google OAuth, magic links, password reset)
- ✅ **User Interface** (Header, user menu, dark mode, login/logout)
- ✅ **Multi-step form questionnaire** (TypeForm-style UI)
- ✅ **Edit wedding details** (update anytime from dashboard)
- ✅ **AI-powered vendor matching** (88+ vendors across 5 regions)
- ✅ **Email outreach system** (generate & send personalized emails with retry logic)
- ✅ **Dashboard** (empty state, wedding summary, response tracking)
- ✅ **Vendor database** (Newcastle, Hunter Valley, Sydney, Blue Mountains, South Coast)
- ✅ **Resend webhook tracking** (delivery, open, bounce events)
- ✅ **Rate limiting** (Upstash Redis with in-memory dev fallback)
- ✅ **Error monitoring** (Sentry with per-page error boundaries)
- ✅ **Security headers** (HSTS, X-Frame-Options, CSP, Referrer-Policy)
- ✅ **Input validation** (server-side date/budget/email validation, prompt injection protection)
- ✅ **Testing suite** (121 unit tests + 16 E2E tests)
- ✅ **Production deployment** (Vercel + Supabase)

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 20+
- PostgreSQL (local or cloud)
- Claude API key (Anthropic)

### Installation

1. **Clone and install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add:
   - `DATABASE_URL`: Your PostgreSQL connection string (Supabase)
   - `ANTHROPIC_API_KEY`: Your Claude API key
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `RESEND_API_KEY`: Your Resend API key (for email)
   - `EMAIL_FROM`: Your verified sender email
   - `RESEND_WEBHOOK_SECRET`: Your Resend webhook signing secret
   - `UPSTASH_REDIS_REST_URL`: Upstash Redis URL (optional in dev)
   - `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis token (optional in dev)
   - `NEXT_PUBLIC_SENTRY_DSN`: Sentry DSN (optional in dev)
   - `SENTRY_ORG`: Sentry organization slug
   - `SENTRY_PROJECT`: Sentry project name
   - `SENTRY_AUTH_TOKEN`: Sentry auth token for source maps

3. **Set up database**

   ```bash
   npm run db:push
   ```

4. **Seed vendor data**

   ```bash
   npm run db:seed:all-vendors
   ```

   Or seed individual regions:
   ```bash
   npm run db:seed:newcastle
   npm run db:seed:hunter-valley
   npm run db:seed:sydney
   npm run db:seed:blue-mountains
   npm run db:seed:south-coast
   ```

5. **Run development server**

   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## 📁 Project Structure

```
wedding-plan/
├── app/                       # Next.js 15 App Router
│   ├── api/                  # API routes
│   │   ├── auth/            # Auth sync & logout
│   │   ├── chat/            # Claude AI chat
│   │   ├── outreach/        # Email generation & sending
│   │   ├── vendors/         # Vendor matching
│   │   ├── webhooks/resend/ # Resend delivery webhooks
│   │   └── wedding/         # Wedding CRUD
│   ├── auth/                # Login, signup, reset-password, update-password
│   ├── dashboard/           # User dashboard pages
│   ├── questionnaire/       # 5-step form
│   ├── outreach/            # Email preview & sending
│   ├── vendors/             # Vendor browsing
│   ├── global-error.tsx     # Global Sentry error boundary
│   └── */error.tsx          # Per-route error boundaries (auth, dashboard, chat, questionnaire, outreach)
├── components/              # React components
├── lib/                     # Core utilities
│   ├── supabase/           # Supabase Auth clients
│   ├── email/              # Resend integration + email generation
│   ├── auth-helpers.ts     # Auth utilities + redirect validation
│   ├── claude.ts           # Claude API
│   ├── env-validation.ts   # Environment variable validation
│   ├── input-validation.ts # Input sanitization + prompt injection protection
│   ├── rate-limit.ts       # Upstash Redis rate limiting
│   ├── retry.ts            # Exponential backoff retry utility
│   ├── vendor-matching.ts  # Matching algorithm
│   └── prisma.ts           # Database client
├── prisma/
│   └── schema.prisma       # Database schema
├── scripts/                 # Database seeding (5 regions)
├── e2e/                     # Playwright E2E tests
├── test/                    # Vitest unit tests
│   ├── lib/                # Utility tests (input-validation, retry, rate-limit, etc.)
│   ├── api/                # API route logic tests
│   └── components/         # Component tests
├── instrumentation*.ts     # Sentry instrumentation
├── sentry.*.config.ts      # Sentry server/edge config
└── playwright.config.ts    # Playwright E2E config
```

## 🎨 Features

### ✅ Implemented

**Authentication & User Management:**
- [x] Supabase Auth (email/password, Google OAuth, magic links)
- [x] Password reset flow (request + update pages)
- [x] User menu with avatar/initials
- [x] Login/logout UI with dropdown
- [x] Session management across pages
- [x] Open redirect protection

**Wedding Planning Flow:**
- [x] 5-step form questionnaire (Date, Location, Guests, Budget, Style)
- [x] Edit wedding details anytime
- [x] Server-side input validation (past dates, budget floors, guest count clamping)
- [x] Dashboard empty state with clear CTAs
- [x] Wedding summary card on dashboard
- [x] AI-powered vendor matching

**Vendor Database:**
- [x] 17 Newcastle vendors
- [x] 28 Hunter Valley vendors
- [x] 17 Sydney vendors
- [x] 12 Blue Mountains vendors
- [x] 14 South Coast vendors
- [x] Total: 88+ vendors across 5 regions

**Email Outreach:**
- [x] Vendor selection UI with checkboxes
- [x] AI-powered personalized email generation (with retry logic)
- [x] Batch email sending via Resend API (with retry logic)
- [x] Email preview & editing before sending
- [x] Email validation before sending
- [x] Only creates outreach records for successful sends

**Dashboard & Tracking:**
- [x] Outreach statistics (contacted, delivered, opened, responded)
- [x] Resend webhook integration (delivery, open, bounce, complaint tracking)
- [x] Response tracking table
- [x] Manual response entry
- [x] Individual vendor detail pages

**Reliability & Security:**
- [x] Upstash Redis rate limiting (with in-memory dev fallback)
- [x] Sentry error monitoring (client, server, edge)
- [x] Per-page error boundaries (auth, dashboard, chat, questionnaire, outreach)
- [x] Global error boundary
- [x] Retry with exponential backoff (Claude API, Resend API)
- [x] Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [x] Input sanitization and prompt injection protection

**Quality & Testing:**
- [x] 121 unit tests (Vitest + React Testing Library)
- [x] 16 E2E tests (Playwright — homepage, auth, navigation, security headers)
- [x] ESLint + Prettier with auto-formatting
- [x] TypeScript strict mode
- [x] Production deployment (Vercel + Supabase)

### 📅 Planned

- [ ] Loading states (`loading.tsx` for key routes)
- [ ] Content Security Policy header
- [ ] Quote comparison tools
- [ ] Budget tracker
- [ ] Guest list management

## 🧪 Using the App

### New User Flow:

1. **Visit the site** - See beautiful landing page
2. **Sign in** - Click "Sign In" in header, use Google or email/password
3. **Dashboard redirect** - See empty state: "We need details about your special day"
4. **Complete questionnaire** - Click "Complete Wedding Details"
   - 5 steps with visual progress bar
   - Large, easy-to-click buttons
   - Smooth animations between steps
   - Data saves automatically at the end
5. **View dashboard** - See wedding summary with your details
6. **Browse vendors** - View AI-matched vendors for your preferences
7. **Select vendors** - Choose who to contact (checkboxes)
8. **Generate emails** - AI creates personalized messages
9. **Send outreach** - Batch send via Resend API
10. **Track responses** - Dashboard shows delivery, open, response status

### Edit Wedding Details:

1. Go to Dashboard
2. Click "Edit Details" button (next to "Your Wedding")
3. Form pre-fills with current selections (highlighted)
4. Update any answers
5. Saves automatically on completion

## 📖 Documentation

**Essential:**
- [QUICK_START.md](./QUICK_START.md) - Get started in 3 minutes
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deploy to production
- [TESTING_PLAN.md](./TESTING_PLAN.md) - Testing strategy
- [BUGS.md](./BUGS.md) - Known issues and tracking

**Comprehensive Documentation:**
- [docs/INDEX.md](./docs/INDEX.md) - Complete documentation index
- [docs/product/PRD.md](./docs/product/PRD.md) - Product requirements
- [docs/architecture/ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md) - Technical architecture
- [docs/guides/VENDOR_DATABASE_STRATEGY.md](./docs/guides/VENDOR_DATABASE_STRATEGY.md) - Vendor data expansion
- [VENDOR_DATABASE_EXPANSION.md](./VENDOR_DATABASE_EXPANSION.md) - Hunter Valley expansion summary

## 🎯 Launch Status

**Status**: ✅ Production Ready (March 2026)

**Live URL**: [wedding-plan-v2.vercel.app](https://wedding-plan-v2.vercel.app)

**Coverage**:
- **Newcastle, NSW** - 17 vendors
- **Hunter Valley, NSW** - 28 vendors
- **Sydney, NSW** - 17 vendors
- **Blue Mountains, NSW** - 12 vendors
- **South Coast, NSW** - 14 vendors
- **Total**: 88+ vendors across 5 regions

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests (starts dev server automatically)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Lint code
npm run lint
```

**Test Coverage (137 total tests):**
- ✅ 121 unit tests (Vitest) — input validation, retry logic, rate limiting, env validation, auth helpers, vendor matching, API route logic
- ✅ 16 E2E tests (Playwright) — homepage, auth pages, navigation redirects, security headers
- ✅ Component tests (VendorCard)
- ✅ API logic tests (webhook events, wedding data transformations, email generation)

## 🚀 Development Workflow

```bash
# Start dev server
npm run dev

# Lint and fix
npm run lint:fix

# Format code
npm run format

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

## 📊 Database Commands

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Open Prisma Studio
npm run db:studio

# Seed all vendors (5 regions)
npm run db:seed:all-vendors

# Seed individual regions
npm run db:seed:newcastle
npm run db:seed:hunter-valley
npm run db:seed:sydney
npm run db:seed:blue-mountains
npm run db:seed:south-coast

# Test database connection
npm run db:test
```

## 🤝 Contributing

This is currently a solo project. Contributions welcome after MVP launch.

## 📄 License

Private - Not yet open source

## 🏆 Recent Improvements (March 2026)

### Reliability & Security:
- **Password reset flow** — full reset-password and update-password pages
- **Silent email failure fix** — only tracks successfully sent emails
- **Upstash Redis rate limiting** — persistent across serverless cold starts (in-memory dev fallback)
- **Sentry error monitoring** — client, server, and edge runtime with per-page error boundaries
- **Security headers** — HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Input validation** — server-side date/budget/guest validation, email format checking, prompt injection protection
- **Retry logic** — exponential backoff with jitter for Claude API and Resend API calls
- **Resend webhooks** — automatic delivery, open, bounce, and complaint tracking

### Content:
- **Vendor expansion** — 3 new regions (Sydney 17, Blue Mountains 12, South Coast 14) = 88+ total vendors
- **All questionnaire locations covered** — every location option now has matching vendors

### Testing:
- **121 unit tests** (Vitest) — input validation, retry, rate limiting, env validation, auth helpers, vendor matching, API logic
- **16 E2E tests** (Playwright) — homepage, auth pages, navigation redirects, security headers
- **Total: 137 tests, all passing**

---

**Built with care for couples planning their dream wedding in Australia**
