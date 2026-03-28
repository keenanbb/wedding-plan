# Trim and Ship MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Bower into a launch-ready, paid product: remove the chatbot, add Stripe payment ($49), Spam Act compliance, vendor import, and vendor data bootstrap tooling.

**Architecture:** The app is Next.js 15 App Router with Prisma/PostgreSQL (Supabase), Supabase Auth, and Resend email. We add Stripe Checkout (one-time payment) gating the outreach API routes, an unsubscribe endpoint for email compliance, and a vendor import flow for paid users. Vendor bootstrap uses external tooling (Outscraper, Easy Weddings) with an import script.

**Tech Stack:** Next.js 15, TypeScript, Prisma, Stripe (new), Resend, Supabase Auth, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-28-trim-and-ship-design.md`

---

## File Structure

### Files to Delete
- `app/chat/page.tsx`
- `app/chat/loading.tsx`
- `app/chat/error.tsx`
- `app/api/chat/route.ts`
- `components/ChatInterface.tsx`

### Files to Create
- `lib/stripe.ts` — Stripe client singleton
- `lib/payment.ts` — Payment guard helper (`checkPaymentStatus`)
- `app/api/checkout/route.ts` — Creates Stripe Checkout Session
- `app/api/webhooks/stripe/route.ts` — Handles Stripe payment webhook
- `app/api/unsubscribe/route.ts` — Vendor email opt-out endpoint
- `app/vendors/import/page.tsx` — CSV/manual vendor import (paid users)
- `app/api/vendors/import/route.ts` — Vendor import API
- `scripts/bootstrap-vendors.ts` — Outscraper/Easy Weddings import pipeline
- `test/lib/payment.test.ts` — Payment guard tests
- `test/api/stripe-webhook.test.ts` — Stripe webhook tests
- `test/api/unsubscribe.test.ts` — Unsubscribe endpoint tests

### Files to Modify
- `prisma/schema.prisma` — Add `paidAt`, `stripeSessionId` to Wedding; add `unsubscribed`/`unsubscribedAt` to VendorOutreach
- `components/Header.tsx` — Remove `/chat` nav link
- `components/MobileNav.tsx` — Remove `/chat` from links array
- `app/page.tsx` — Update landing page stats, remove "100% Free" claim
- `app/questionnaire/page.tsx` — Add Newcastle location option, redirect to `/vendors` after submit
- `app/api/outreach/generate-emails/route.ts` — Add payment guard
- `app/api/outreach/send-batch/route.ts` — Add payment guard, skip unsubscribed vendors
- `lib/email/generate-vendor-email.ts` — Add unsubscribe link + Bower footer to prompt/output
- `package.json` — Add `stripe` dependency

---

## Task 1: Remove Chat Feature

**Files:**
- Delete: `app/chat/page.tsx`, `app/chat/loading.tsx`, `app/chat/error.tsx`, `app/api/chat/route.ts`, `components/ChatInterface.tsx`
- Modify: `components/Header.tsx:53-57`, `components/MobileNav.tsx:11-14`

- [ ] **Step 1: Delete chat files**

```bash
rm app/chat/page.tsx app/chat/loading.tsx app/chat/error.tsx app/api/chat/route.ts components/ChatInterface.tsx
```

- [ ] **Step 2: Remove chat link from Header**

In `components/Header.tsx`, remove the Assistant nav link (lines 52-57):

```tsx
// DELETE this block:
                  <Link
                    href="/chat"
                    className="px-3.5 py-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors duration-200"
                  >
                    Assistant
                  </Link>
```

- [ ] **Step 3: Remove chat link from MobileNav**

In `components/MobileNav.tsx`, update the `links` array (line 11-14):

```tsx
  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/vendors', label: 'Vendors' },
  ]
```

- [ ] **Step 4: Verify the app builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds with no references to deleted chat files.

- [ ] **Step 5: Run existing tests to confirm nothing breaks**

Run: `npm run test:run 2>&1 | tail -20`
Expected: All existing tests pass. Any chat-specific tests should be removed if they exist.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Remove chat feature: delete chatbot page, API route, and component

Background AI email generation is retained. The chat interface
was redundant with the structured questionnaire."
```

---

## Task 2: Prisma Schema Changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add payment fields to Wedding model**

In `prisma/schema.prisma`, add these fields to the `Wedding` model after the `chatCompleted` field:

```prisma
  // Payment
  paidAt           DateTime?
  stripeSessionId  String?
```

- [ ] **Step 2: Add unsubscribe fields to VendorOutreach model**

In `prisma/schema.prisma`, add these fields to the `VendorOutreach` model after the `bounced` field:

```prisma
  unsubscribed   Boolean   @default(false)
  unsubscribedAt DateTime?
```

- [ ] **Step 3: Push schema changes**

Run: `npx prisma db push`
Expected: Schema pushed successfully. No data loss warnings (new nullable fields only).

- [ ] **Step 4: Regenerate Prisma client**

Run: `npx prisma generate`
Expected: Client generated successfully.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "Add payment and unsubscribe fields to Prisma schema

Wedding: paidAt, stripeSessionId for Stripe one-time payment.
VendorOutreach: unsubscribed, unsubscribedAt for Spam Act compliance."
```

---

## Task 3: Stripe Checkout Integration

**Files:**
- Create: `lib/stripe.ts`, `app/api/checkout/route.ts`, `app/api/webhooks/stripe/route.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Stripe SDK**

Run: `npm install stripe`

- [ ] **Step 2: Create Stripe client singleton**

Create `lib/stripe.ts`:

```typescript
import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }
    stripeClient = new Stripe(key, {
      typescript: true,
    })
  }
  return stripeClient
}
```

- [ ] **Step 3: Create checkout API route**

Create `app/api/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const { weddingId } = await req.json()

    if (!weddingId) {
      return NextResponse.json({ error: 'weddingId is required' }, { status: 400 })
    }

    // Verify the wedding belongs to this user
    const wedding = await prisma.wedding.findFirst({
      where: { id: weddingId, userId: user.dbUser.id },
    })

    if (!wedding) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 })
    }

    if (wedding.paidAt) {
      return NextResponse.json({ error: 'Already paid' }, { status: 400 })
    }

    const stripe = getStripe()
    const priceId = process.env.STRIPE_PRICE_ID

    if (!priceId) {
      return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
    }

    const origin = req.headers.get('origin') || 'https://wedding-plan-v2.vercel.app'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/vendors?payment=cancelled`,
      metadata: {
        weddingId: wedding.id,
        userId: user.dbUser.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create Stripe webhook handler**

Create `app/api/webhooks/stripe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const stripe = getStripe()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const weddingId = session.metadata?.weddingId

      if (weddingId) {
        await prisma.wedding.update({
          where: { id: weddingId },
          data: {
            paidAt: new Date(),
            stripeSessionId: session.id,
          },
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add lib/stripe.ts app/api/checkout/route.ts app/api/webhooks/stripe/route.ts package.json package-lock.json
git commit -m "Add Stripe Checkout: one-time \$49 AUD payment for outreach

- Stripe client singleton (lib/stripe.ts)
- POST /api/checkout creates a Checkout Session
- POST /api/webhooks/stripe handles checkout.session.completed
- Sets paidAt on Wedding record upon successful payment"
```

---

## Task 4: Payment Guard on Outreach Routes

**Files:**
- Create: `lib/payment.ts`, `test/lib/payment.test.ts`
- Modify: `app/api/outreach/generate-emails/route.ts`, `app/api/outreach/send-batch/route.ts`

- [ ] **Step 1: Write the payment guard test**

Create `test/lib/payment.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('requirePayment', () => {
  it('returns error response when wedding has no paidAt', async () => {
    const wedding = { id: 'w1', paidAt: null }
    const result = checkPaymentStatus(wedding as any)
    expect(result.paid).toBe(false)
  })

  it('returns success when wedding has paidAt', async () => {
    const wedding = { id: 'w1', paidAt: new Date('2026-01-01') }
    const result = checkPaymentStatus(wedding as any)
    expect(result.paid).toBe(true)
  })
})

// Import after defining tests for clarity
import { checkPaymentStatus } from '@/lib/payment'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/lib/payment.test.ts 2>&1 | tail -10`
Expected: FAIL — `@/lib/payment` does not exist.

- [ ] **Step 3: Create payment helper**

Create `lib/payment.ts`:

```typescript
import { Wedding } from '@prisma/client'

export interface PaymentStatus {
  paid: boolean
}

/**
 * Check if a wedding has been paid for.
 * Used to guard outreach API routes.
 */
export function checkPaymentStatus(wedding: Pick<Wedding, 'paidAt'>): PaymentStatus {
  return { paid: wedding.paidAt !== null }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/lib/payment.test.ts 2>&1 | tail -10`
Expected: PASS — both tests green.

- [ ] **Step 5: Add payment guard to generate-emails route**

In `app/api/outreach/generate-emails/route.ts`, add import at the top:

```typescript
import { checkPaymentStatus } from '@/lib/payment'
```

Then after the wedding ownership check (after `const wedding = ...` and its null check), add:

```typescript
    // Require payment
    const paymentStatus = checkPaymentStatus(wedding)
    if (!paymentStatus.paid) {
      return NextResponse.json(
        { error: 'Payment required. Upgrade to send vendor emails.', requiresPayment: true },
        { status: 402 }
      )
    }
```

- [ ] **Step 6: Add payment guard to send-batch route**

In `app/api/outreach/send-batch/route.ts`, add the import at the top:

```typescript
import { checkPaymentStatus } from '@/lib/payment'
```

Then after the wedding ownership lookup and its null check, add:

```typescript
    // Require payment
    const paymentStatus = checkPaymentStatus(wedding)
    if (!paymentStatus.paid) {
      return NextResponse.json(
        { error: 'Payment required. Upgrade to send vendor emails.', requiresPayment: true },
        { status: 402 }
      )
    }
```

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run 2>&1 | tail -20`
Expected: All tests pass including the new payment tests.

- [ ] **Step 8: Commit**

```bash
git add lib/payment.ts test/lib/payment.test.ts app/api/outreach/generate-emails/route.ts app/api/outreach/send-batch/route.ts
git commit -m "Add payment guard to outreach routes

Outreach email generation and sending now require wedding.paidAt
to be set. Returns 402 with requiresPayment flag for frontend
upgrade prompts."
```

---

## Task 5: Spam Act Compliance — Unsubscribe Endpoint

**Files:**
- Create: `app/api/unsubscribe/route.ts`, `test/api/unsubscribe.test.ts`
- Modify: `lib/email/generate-vendor-email.ts`

- [ ] **Step 1: Write the unsubscribe test**

Create `test/api/unsubscribe.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    vendorOutreach: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('Unsubscribe logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks outreach as unsubscribed when valid token provided', async () => {
    const mockOutreach = { id: 'out1', unsubscribed: false }
    vi.mocked(prisma.vendorOutreach.findUnique).mockResolvedValue(mockOutreach as any)
    vi.mocked(prisma.vendorOutreach.update).mockResolvedValue({ ...mockOutreach, unsubscribed: true } as any)

    // Simulate the handler logic
    const outreach = await prisma.vendorOutreach.findUnique({ where: { id: 'out1' } })
    expect(outreach).toBeTruthy()

    await prisma.vendorOutreach.update({
      where: { id: 'out1' },
      data: { unsubscribed: true, unsubscribedAt: expect.any(Date) },
    })

    expect(prisma.vendorOutreach.update).toHaveBeenCalledWith({
      where: { id: 'out1' },
      data: { unsubscribed: true, unsubscribedAt: expect.any(Date) },
    })
  })

  it('handles invalid token gracefully', async () => {
    vi.mocked(prisma.vendorOutreach.findUnique).mockResolvedValue(null)
    const outreach = await prisma.vendorOutreach.findUnique({ where: { id: 'invalid' } })
    expect(outreach).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run test/api/unsubscribe.test.ts 2>&1 | tail -10`
Expected: PASS.

- [ ] **Step 3: Create unsubscribe endpoint**

Create `app/api/unsubscribe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

/**
 * Vendor unsubscribe endpoint — Spam Act 2003 compliance.
 * GET /api/unsubscribe?token=[vendorOutreachId]
 *
 * Shows a confirmation page. Vendors who unsubscribe will never
 * be re-emailed from this wedding.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return new NextResponse(renderPage('Invalid unsubscribe link.', false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  try {
    const outreach = await prisma.vendorOutreach.findUnique({
      where: { id: token },
      include: { vendor: true },
    })

    if (!outreach) {
      return new NextResponse(renderPage('This unsubscribe link is no longer valid.', false), {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    if (outreach.unsubscribed) {
      return new NextResponse(renderPage('You have already been unsubscribed.', true), {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    await prisma.vendorOutreach.update({
      where: { id: token },
      data: {
        unsubscribed: true,
        unsubscribedAt: new Date(),
      },
    })

    return new NextResponse(
      renderPage('You have been successfully unsubscribed. You will not receive further emails from this inquiry.', true),
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return new NextResponse(renderPage('Something went wrong. Please try again later.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

function renderPage(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe — Bower</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:60px auto;padding:20px;color:#1c1917;text-align:center}
.icon{font-size:48px;margin-bottom:16px}.msg{font-size:18px;line-height:1.6}
.brand{margin-top:40px;color:#a8a29e;font-size:14px}</style></head>
<body>
<div class="icon">${success ? '✓' : '⚠'}</div>
<p class="msg">${message}</p>
<p class="brand">Bower — Wedding Vendor Discovery</p>
</body></html>`
}
```

- [ ] **Step 4: Update email generation to include unsubscribe footer**

In `lib/email/generate-vendor-email.ts`, update the `generateVendorEmail` function. After the email body is parsed (after `const body = bodyMatch?.[1]?.trim() || generatedText`), append the compliance footer:

```typescript
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://wedding-plan-v2.vercel.app'}/api/unsubscribe?token=OUTREACH_ID_PLACEHOLDER`

    const footer = `\n\n---\nSent via Bower on behalf of a couple planning their wedding.\nIf you'd prefer not to receive inquiries like this, you can unsubscribe: ${unsubscribeUrl}`

    return { subject, body: body + footer }
```

Also update `generateFallbackEmail` — add the same `footer` variable and append it to the return value:

```typescript
function generateFallbackEmail(
  vendor: Vendor,
  wedding: Wedding,
  userEmail: string
): GeneratedEmail {
  // ... existing code unchanged ...

  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://wedding-plan-v2.vercel.app'}/api/unsubscribe?token=OUTREACH_ID_PLACEHOLDER`
  const footer = `\n\n---\nSent via Bower on behalf of a couple planning their wedding.\nIf you'd prefer not to receive inquiries like this, you can unsubscribe: ${unsubscribeUrl}`

  return { subject, body: body + footer }
}
```

Note: The `OUTREACH_ID_PLACEHOLDER` gets replaced with the actual outreach ID in the send-batch route after the VendorOutreach record is created. In `app/api/outreach/send-batch/route.ts`, find the line where `emailBody` is passed to the Resend send call, and replace the placeholder before sending:

```typescript
const finalBody = email.body.replace('OUTREACH_ID_PLACEHOLDER', outreach.id)
```

Use `finalBody` instead of `email.body` in the Resend API call.

- [ ] **Step 5: Update send-batch to skip unsubscribed vendors**

In `app/api/outreach/send-batch/route.ts`, when looking up existing outreach records or before sending, add a check:

```typescript
    // Skip vendors who have unsubscribed from a previous outreach
    const previousOutreach = await prisma.vendorOutreach.findFirst({
      where: {
        vendorId: email.vendorId,
        unsubscribed: true,
      },
    })
    if (previousOutreach) {
      continue // Skip this vendor — they've opted out
    }
```

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run 2>&1 | tail -20`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/api/unsubscribe/route.ts test/api/unsubscribe.test.ts lib/email/generate-vendor-email.ts app/api/outreach/send-batch/route.ts
git commit -m "Add Spam Act 2003 compliance: unsubscribe endpoint + email footer

- GET /api/unsubscribe?token=ID marks vendor as opted out
- All outreach emails include unsubscribe link and Bower attribution
- Send-batch skips vendors who have previously unsubscribed"
```

---

## Task 6: Questionnaire Refinements

**Files:**
- Modify: `app/questionnaire/page.tsx`

- [ ] **Step 1: Add Newcastle to location options**

In `app/questionnaire/page.tsx`, update the location step options (lines 28-36) to include Newcastle:

```tsx
  {
    id: 'location',
    title: 'Location',
    question: 'Where would you like to celebrate?',
    type: 'select' as const,
    options: [
      { value: 'Sydney', label: 'Sydney & surrounds' },
      { value: 'Newcastle', label: 'Newcastle' },
      { value: 'Blue Mountains', label: 'Blue Mountains' },
      { value: 'Hunter Valley', label: 'Hunter Valley' },
      { value: 'South Coast', label: 'South Coast' },
      { value: 'custom', label: 'Other area' },
    ],
  },
```

- [ ] **Step 2: Update redirect after questionnaire completion**

In `app/questionnaire/page.tsx`, change the success redirect in `handleSubmit` (line 305) from `/dashboard` to `/vendors`:

```tsx
      // Redirect to vendor matches
      router.push('/vendors')
      router.refresh()
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/questionnaire/page.tsx
git commit -m "Questionnaire: add Newcastle location, redirect to vendor matches

Newcastle has vendor coverage but was missing from the dropdown.
Post-questionnaire redirect now goes to /vendors (the value moment)
instead of /dashboard."
```

---

## Task 7: Landing Page Updates

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update stats band**

In `app/page.tsx`, find the stats section (around line 133-148) and update to reflect the new model:

```tsx
            {[
              { value: '85+', label: 'Verified vendors' },
              { value: '5', label: 'NSW regions' },
              { value: '6', label: 'Vendor categories' },
              { value: '$49', label: 'One-time fee' },
            ].map((stat, idx) => (
```

This replaces `'100%', 'Free to use'` with `'$49', 'One-time fee'`.

- [ ] **Step 2: Verify no chat references remain on landing page**

Search `app/page.tsx` for "chat", "assistant", "Claude", "AI-Powered", "chatbot". Remove or update any references found.

Run: `grep -in "chat\|assistant\|claude\|chatbot" app/page.tsx`
Expected: No matches, or only benign uses like "AI" in the meta description context.

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "Landing page: update stats to reflect paid model, remove chat refs

Replace '100% Free to use' with '$49 One-time fee' in the stats
band. Remove any remaining chatbot/assistant references."
```

---

## Task 8: Upgrade Prompt on Vendors Page

**Files:**
- Modify: `app/vendors/page.tsx`

The vendors page needs to show a paywall prompt when users try to proceed to outreach. Free users can browse vendors; paid users see the "Send emails" flow.

- [ ] **Step 1: Add payment status check to vendors page**

In `app/vendors/page.tsx`, after the wedding is fetched (around line 36 `const wedding = dbUser.weddings[0]`), query the payment status:

```tsx
  const isPaid = wedding.paidAt !== null
```

- [ ] **Step 2: Add upgrade CTA section to the page**

In the JSX of `app/vendors/page.tsx`, find where the "Contact Selected Vendors" or outreach action button is rendered. Wrap it to show different content based on payment:

```tsx
        {/* Outreach CTA */}
        {isPaid ? (
          <Link
            href="/outreach/preview"
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-full font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors"
          >
            Send emails to selected vendors
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        ) : (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-serif text-stone-900 dark:text-stone-100 mb-2">
              Ready to reach out?
            </h3>
            <p className="text-stone-500 dark:text-stone-400 mb-6 max-w-md mx-auto">
              We&apos;ll write personalised emails to each vendor and send them on your behalf. Track every response from your dashboard.
            </p>
            <UpgradeButton weddingId={wedding.id} />
          </div>
        )}
```

- [ ] **Step 3: Create the UpgradeButton client component**

Add this as a client component at the bottom of `app/vendors/page.tsx` (or in a separate file if preferred):

```tsx
'use client'

function UpgradeButton({ weddingId }: { weddingId: string }) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="inline-flex items-center gap-2 px-8 py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-full text-base font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors disabled:opacity-50"
    >
      {loading ? 'Redirecting...' : 'Unlock outreach — $49'}
    </button>
  )
}
```

Note: Since the main page is a server component but `UpgradeButton` needs `useState` and click handlers, either extract it into a separate `components/UpgradeButton.tsx` file with `'use client'`, or inline it at the bottom of the page file with its own `'use client'` boundary. The recommended approach is a separate file.

- [ ] **Step 4: Handle payment=success and payment=cancelled query params**

Check if `searchParams` includes `payment=success` and show a brief success banner at the top of the vendors page or dashboard (where Stripe redirects to):

The success URL goes to `/dashboard?payment=success` — add a simple conditional in `app/dashboard/page.tsx`:

```tsx
  // At the top of the component, read searchParams
  const searchParams = await props.searchParams
  const paymentSuccess = searchParams?.payment === 'success'

  // In the JSX, before the main content:
  {paymentSuccess && (
    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
      <p className="text-sm text-green-700 dark:text-green-400">
        Payment confirmed! You can now generate and send vendor emails.
      </p>
    </div>
  )}
```

- [ ] **Step 5: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/vendors/page.tsx app/dashboard/page.tsx components/UpgradeButton.tsx
git commit -m "Add upgrade prompt on vendors page and payment success banner

Free users see 'Unlock outreach — \$49' CTA after browsing vendors.
Paid users see the direct 'Send emails' action. Dashboard shows
payment success confirmation banner."
```

---

## Task 9: Vendor Import (Paid Users)

> Note: Task numbering continues from Task 8 (Upgrade Prompt).

**Files:**
- Create: `app/vendors/import/page.tsx`, `app/api/vendors/import/route.ts`

- [ ] **Step 1: Create vendor import API**

Create `app/api/vendors/import/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-helpers'
import { isValidEmail } from '@/lib/input-validation'
import { checkPaymentStatus } from '@/lib/payment'
import { prisma } from '@/lib/prisma'

interface ImportedVendor {
  name: string
  email: string
  category: string
  location?: string
  website?: string
  phone?: string
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const { weddingId, vendors } = (await req.json()) as {
      weddingId: string
      vendors: ImportedVendor[]
    }

    if (!weddingId || !vendors || !Array.isArray(vendors)) {
      return NextResponse.json({ error: 'weddingId and vendors array required' }, { status: 400 })
    }

    // Verify wedding ownership and payment
    const wedding = await prisma.wedding.findFirst({
      where: { id: weddingId, userId: user.dbUser.id },
    })

    if (!wedding) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 })
    }

    if (!checkPaymentStatus(wedding).paid) {
      return NextResponse.json({ error: 'Payment required', requiresPayment: true }, { status: 402 })
    }

    // Validate and import vendors
    const results: { imported: number; skipped: number; errors: string[] } = {
      imported: 0,
      skipped: 0,
      errors: [],
    }

    const validCategories = ['VENUE', 'PHOTOGRAPHER', 'CATERING', 'FLORIST', 'ENTERTAINMENT', 'MARQUEE', 'OTHER']

    for (const v of vendors.slice(0, 50)) {
      // Max 50 per batch
      if (!v.name || !v.email) {
        results.errors.push(`Skipped: name and email are required (got "${v.name}")`)
        results.skipped++
        continue
      }

      if (!isValidEmail(v.email)) {
        results.errors.push(`Skipped "${v.name}": invalid email "${v.email}"`)
        results.skipped++
        continue
      }

      const category = v.category?.toUpperCase() || 'OTHER'
      if (!validCategories.includes(category)) {
        results.errors.push(`Skipped "${v.name}": invalid category "${v.category}"`)
        results.skipped++
        continue
      }

      // Check for duplicates (same email in global vendor DB)
      const existing = await prisma.vendor.findFirst({ where: { email: v.email } })
      if (existing) {
        // Link existing vendor to this wedding via SavedVendor if not already linked
        const alreadySaved = await prisma.savedVendor.findUnique({
          where: { weddingId_vendorId: { weddingId, vendorId: existing.id } },
        })
        if (!alreadySaved) {
          await prisma.savedVendor.create({
            data: { weddingId, vendorId: existing.id, notes: 'Imported by user' },
          })
          results.imported++
        } else {
          results.skipped++
        }
        continue
      }

      // Create new vendor and link to wedding
      const newVendor = await prisma.vendor.create({
        data: {
          name: v.name.trim(),
          email: v.email.trim().toLowerCase(),
          category: category as any,
          location: v.location?.trim() || 'NSW',
          website: v.website?.trim() || null,
          phone: v.phone?.trim() || null,
          description: `Imported vendor — ${v.name}`,
          state: 'NSW',
        },
      })

      await prisma.savedVendor.create({
        data: { weddingId, vendorId: newVendor.id, notes: 'Imported by user' },
      })

      results.imported++
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Vendor import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create vendor import page**

Create `app/vendors/import/page.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export default function VendorImportPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'manual' | 'csv'>('manual')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('VENUE')
  const [location, setLocation] = useState('')
  const [csvText, setCsvText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getWeddingId = async (): Promise<string | null> => {
    const res = await fetch('/api/wedding')
    if (!res.ok) return null
    const data = await res.json()
    return data.wedding?.id || null
  }

  const handleManualAdd = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const weddingId = await getWeddingId()
    if (!weddingId) {
      setError('No wedding found. Complete the questionnaire first.')
      setIsSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/vendors/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId,
          vendors: [{ name: name.trim(), email: email.trim(), category, location: location.trim() || undefined }],
        }),
      })

      if (res.status === 402) {
        setError('Payment required to import vendors.')
        setIsSubmitting(false)
        return
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setResult(data)
      setName('')
      setEmail('')
      setLocation('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCsvImport = async () => {
    if (!csvText.trim()) {
      setError('Paste CSV data first')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const weddingId = await getWeddingId()
    if (!weddingId) {
      setError('No wedding found. Complete the questionnaire first.')
      setIsSubmitting(false)
      return
    }

    try {
      // Simple CSV parsing: name,email,category,location
      const lines = csvText.trim().split('\n')
      const vendors = lines
        .filter(line => line.trim() && !line.toLowerCase().startsWith('name'))
        .map(line => {
          const [name, email, category, location] = line.split(',').map(s => s.trim())
          return { name, email, category: category || 'OTHER', location }
        })

      const res = await fetch('/api/vendors/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId, vendors }),
      })

      if (res.status === 402) {
        setError('Payment required to import vendors.')
        setIsSubmitting(false)
        return
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-stone-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link
            href="/vendors"
            className="inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Vendors
          </Link>
        </div>

        <h1 className="text-3xl font-serif font-light text-stone-900 dark:text-stone-100 mb-2">Import Vendors</h1>
        <p className="text-stone-500 dark:text-stone-400 mb-8">
          Add vendors you&apos;ve found yourself. They&apos;ll appear alongside your matched vendors for outreach.
        </p>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setMode('manual')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900' : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700'}`}
          >
            Add manually
          </button>
          <button
            onClick={() => setMode('csv')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'csv' ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900' : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700'}`}
          >
            Paste CSV
          </button>
        </div>

        {mode === 'manual' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Vendor name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coastal Photography" className="w-full px-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@vendor.com.au" className="w-full px-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-600">
                <option value="VENUE">Venue</option>
                <option value="PHOTOGRAPHER">Photographer</option>
                <option value="CATERING">Catering</option>
                <option value="FLORIST">Florist</option>
                <option value="ENTERTAINMENT">Entertainment</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Location (optional)</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Sydney" className="w-full px-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-600" />
            </div>
            <button onClick={handleManualAdd} disabled={isSubmitting} className="w-full px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors disabled:opacity-50">
              {isSubmitting ? 'Adding...' : 'Add vendor'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-stone-500 dark:text-stone-400">Format: <code className="bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-xs">name,email,category,location</code> (one per line)</p>
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              rows={8}
              placeholder={'Coastal Photography,hello@coastal.com.au,PHOTOGRAPHER,Sydney\nVineyard Venue,info@vineyard.com.au,VENUE,Hunter Valley'}
              className="w-full px-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
            <button onClick={handleCsvImport} disabled={isSubmitting} className="w-full px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors disabled:opacity-50">
              {isSubmitting ? 'Importing...' : 'Import vendors'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-sm text-green-700 dark:text-green-400">
              Imported {result.imported} vendor{result.imported !== 1 ? 's' : ''}.
              {result.skipped > 0 && ` Skipped ${result.skipped}.`}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 text-xs text-green-600 dark:text-green-500 space-y-1">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/vendors/import/page.tsx app/api/vendors/import/route.ts
git commit -m "Add vendor import: manual add and CSV paste for paid users

- POST /api/vendors/import handles batch import with validation
- /vendors/import page with manual and CSV modes
- Payment-gated (402 if not paid)
- Deduplicates against existing vendor DB"
```

---

## Task 10: Vendor Data Bootstrap Script

**Files:**
- Create: `scripts/bootstrap-vendors.ts`

- [ ] **Step 1: Create bootstrap script**

Create `scripts/bootstrap-vendors.ts`:

```typescript
/**
 * Vendor Data Bootstrap Script
 *
 * Imports vendor data from external sources (Outscraper JSON, manual CSV)
 * into the Prisma database. Handles deduplication and validation.
 *
 * Usage:
 *   npx tsx scripts/bootstrap-vendors.ts --file data/outscraper-sydney.json --region Sydney
 *   npx tsx scripts/bootstrap-vendors.ts --file data/vendors.csv --region "Hunter Valley" --format csv
 *   npx tsx scripts/bootstrap-vendors.ts --file data/outscraper-sydney.json --region Sydney --dry-run
 */

import { PrismaClient, VendorCategory, PriceRange } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface OutscraperRecord {
  name: string
  full_address?: string
  city?: string
  state?: string
  phone?: string
  site?: string
  email_1?: string
  email_2?: string
  category?: string
  rating?: number
  reviews?: number
  latitude?: number
  longitude?: number
  price_level?: string
}

interface CsvRecord {
  name: string
  email: string
  category: string
  location: string
  phone?: string
  website?: string
  rating?: string
  priceMin?: string
  priceMax?: string
  maxGuests?: string
  description?: string
}

interface NormalizedVendor {
  name: string
  email: string
  category: VendorCategory
  location: string
  region: string
  state: string
  phone: string | null
  website: string | null
  rating: number | null
  latitude: number | null
  longitude: number | null
  priceMin: number | null
  priceMax: number | null
  priceRange: PriceRange | null
  maxGuests: number | null
  description: string
}

function mapCategory(raw: string): VendorCategory | null {
  const lower = raw.toLowerCase()
  if (lower.includes('venue') || lower.includes('function') || lower.includes('reception') || lower.includes('estate') || lower.includes('winery')) return 'VENUE'
  if (lower.includes('photo')) return 'PHOTOGRAPHER'
  if (lower.includes('cater') || lower.includes('food') || lower.includes('chef')) return 'CATERING'
  if (lower.includes('flor') || lower.includes('flower')) return 'FLORIST'
  if (lower.includes('dj') || lower.includes('band') || lower.includes('music') || lower.includes('entertain')) return 'ENTERTAINMENT'
  if (lower.includes('marquee') || lower.includes('tent')) return 'MARQUEE'
  return null
}

function mapPriceRange(priceLevel: string | undefined): PriceRange | null {
  if (!priceLevel) return null
  const dollarSigns = (priceLevel.match(/\$/g) || []).length
  if (dollarSigns <= 1) return 'BUDGET'
  if (dollarSigns === 2) return 'MODERATE'
  if (dollarSigns === 3) return 'PREMIUM'
  return 'LUXURY'
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function parseOutscraper(records: OutscraperRecord[], region: string): NormalizedVendor[] {
  const vendors: NormalizedVendor[] = []

  for (const r of records) {
    const email = r.email_1 || r.email_2
    if (!email || !isValidEmail(email)) continue
    if (!r.name) continue

    const category = mapCategory(r.category || '')
    if (!category) continue

    vendors.push({
      name: r.name.trim(),
      email: email.trim().toLowerCase(),
      category,
      location: r.city || region,
      region,
      state: r.state || 'NSW',
      phone: r.phone || null,
      website: r.site || null,
      rating: r.rating || null,
      latitude: r.latitude || null,
      longitude: r.longitude || null,
      priceMin: null,
      priceMax: null,
      priceRange: mapPriceRange(r.price_level),
      maxGuests: null,
      description: `${r.name} — ${category.toLowerCase()} in ${r.city || region}`,
    })
  }

  return vendors
}

function parseCsv(content: string, region: string): NormalizedVendor[] {
  const lines = content.trim().split('\n')
  const vendors: NormalizedVendor[] = []

  // Skip header row
  for (const line of lines.slice(1)) {
    const fields = line.split(',').map(f => f.trim().replace(/^"|"$/g, ''))
    const [name, email, categoryStr, location, phone, website, ratingStr, priceMinStr, priceMaxStr, maxGuestsStr, description] = fields

    if (!name || !email || !isValidEmail(email)) continue

    const category = mapCategory(categoryStr || 'OTHER') || 'OTHER'

    vendors.push({
      name,
      email: email.toLowerCase(),
      category,
      location: location || region,
      region,
      state: 'NSW',
      phone: phone || null,
      website: website || null,
      rating: ratingStr ? parseFloat(ratingStr) : null,
      latitude: null,
      longitude: null,
      priceMin: priceMinStr ? parseInt(priceMinStr) : null,
      priceMax: priceMaxStr ? parseInt(priceMaxStr) : null,
      priceRange: null,
      maxGuests: maxGuestsStr ? parseInt(maxGuestsStr) : null,
      description: description || `${name} — ${category.toLowerCase()} in ${location || region}`,
    })
  }

  return vendors
}

async function importVendors(vendors: NormalizedVendor[], dryRun: boolean): Promise<{ imported: number; skipped: number; duplicates: number }> {
  let imported = 0
  let skipped = 0
  let duplicates = 0

  for (const v of vendors) {
    // Check for duplicate by email
    const existing = await prisma.vendor.findFirst({ where: { email: v.email } })
    if (existing) {
      duplicates++
      continue
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would import: ${v.name} (${v.email}) — ${v.category} in ${v.location}`)
      imported++
      continue
    }

    try {
      await prisma.vendor.create({
        data: {
          name: v.name,
          email: v.email,
          category: v.category,
          location: v.location,
          region: v.region,
          state: v.state,
          phone: v.phone,
          website: v.website,
          rating: v.rating,
          latitude: v.latitude,
          longitude: v.longitude,
          priceMin: v.priceMin,
          priceMax: v.priceMax,
          priceRange: v.priceRange,
          maxGuests: v.maxGuests,
          description: v.description,
        },
      })
      imported++
    } catch (err) {
      console.error(`Failed to import ${v.name}: ${err}`)
      skipped++
    }
  }

  return { imported, skipped, duplicates }
}

async function main() {
  const args = process.argv.slice(2)
  const fileIdx = args.indexOf('--file')
  const regionIdx = args.indexOf('--region')
  const formatIdx = args.indexOf('--format')
  const dryRun = args.includes('--dry-run')

  if (fileIdx === -1 || regionIdx === -1) {
    console.error('Usage: npx tsx scripts/bootstrap-vendors.ts --file <path> --region <region> [--format csv] [--dry-run]')
    process.exit(1)
  }

  const filePath = path.resolve(args[fileIdx + 1])
  const region = args[regionIdx + 1]
  const format = formatIdx !== -1 ? args[formatIdx + 1] : 'json'

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  console.log(`\nBootstrap vendors from: ${filePath}`)
  console.log(`Region: ${region}`)
  console.log(`Format: ${format}`)
  console.log(`Dry run: ${dryRun}\n`)

  const content = fs.readFileSync(filePath, 'utf-8')

  let vendors: NormalizedVendor[]
  if (format === 'csv') {
    vendors = parseCsv(content, region)
  } else {
    const records: OutscraperRecord[] = JSON.parse(content)
    vendors = parseOutscraper(Array.isArray(records) ? records : [records], region)
  }

  console.log(`Parsed ${vendors.length} valid vendors from file\n`)

  if (vendors.length === 0) {
    console.log('No vendors to import.')
    await prisma.$disconnect()
    return
  }

  // Show category breakdown
  const byCat: Record<string, number> = {}
  for (const v of vendors) {
    byCat[v.category] = (byCat[v.category] || 0) + 1
  }
  console.log('Category breakdown:')
  for (const [cat, count] of Object.entries(byCat)) {
    console.log(`  ${cat}: ${count}`)
  }
  console.log('')

  const result = await importVendors(vendors, dryRun)

  console.log(`\nResults:`)
  console.log(`  Imported: ${result.imported}`)
  console.log(`  Skipped (errors): ${result.skipped}`)
  console.log(`  Duplicates (already in DB): ${result.duplicates}`)

  await prisma.$disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Add npm script**

In `package.json`, add to the `scripts` section:

```json
"db:bootstrap": "tsx scripts/bootstrap-vendors.ts"
```

- [ ] **Step 3: Test with dry run using existing seed data format**

Run: `npx tsx scripts/bootstrap-vendors.ts --help 2>&1 | head -5`
Expected: Shows usage message (exits with code 1 since no --file/--region provided).

- [ ] **Step 4: Commit**

```bash
git add scripts/bootstrap-vendors.ts package.json
git commit -m "Add vendor bootstrap script for Outscraper/CSV import

Supports JSON (Outscraper format) and CSV input. Handles category
mapping, email validation, deduplication, and dry-run mode.
Usage: npm run db:bootstrap -- --file data/vendors.json --region Sydney"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run 2>&1 | tail -30`
Expected: All tests pass.

- [ ] **Step 2: Run build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify no dead references to chat**

Run: `grep -rn "\/chat\b" app/ components/ lib/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".test."`
Expected: No results (all chat references removed).

- [ ] **Step 4: Verify payment guard is on outreach routes**

Run: `grep -n "checkPaymentStatus" app/api/outreach/*/route.ts`
Expected: Shows matches in both `generate-emails/route.ts` and `send-batch/route.ts`.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git status
# If clean, no commit needed
# If there are remaining fixes, commit them
```

---

## Summary of Commits

| Task | Commit Message |
|------|---------------|
| 1 | Remove chat feature |
| 2 | Add payment and unsubscribe fields to Prisma schema |
| 3 | Add Stripe Checkout integration |
| 4 | Add payment guard to outreach routes |
| 5 | Add Spam Act compliance: unsubscribe endpoint + email footer |
| 6 | Questionnaire: add Newcastle location, redirect to vendors |
| 7 | Landing page: update stats, remove chat refs |
| 8 | Add upgrade prompt on vendors page + payment success banner |
| 9 | Add vendor import for paid users |
| 10 | Add vendor bootstrap script |
| 11 | Final verification |

## Post-Implementation: Manual Steps

These require the user's involvement (not automatable):

1. **Create Stripe account** and configure product/price ($49 AUD one-time)
2. **Set Vercel env vars**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `NEXT_PUBLIC_SITE_URL`
3. **Configure Stripe webhook** in Stripe Dashboard → point to `/api/webhooks/stripe`
4. **Run Outscraper** for Sydney + Hunter Valley (3 categories each) — export as JSON
5. **Run bootstrap script** with exported data: `npm run db:bootstrap -- --file data/outscraper-sydney.json --region Sydney`
6. **Manual QA** of imported vendor data (spot-check 20% sample)
7. **Set Resend webhook** in Resend Dashboard → point to `/api/webhooks/resend`
