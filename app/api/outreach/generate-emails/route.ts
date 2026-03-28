import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-helpers'
import { checkPaymentStatus } from '@/lib/payment'
import { generateVendorEmail } from '@/lib/email/generate-vendor-email'
import { validateArray } from '@/lib/input-validation'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(req)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    // Rate limiting for AI generation
    const rateLimitResult = await checkRateLimit(user.dbUser.id, RATE_LIMITS.AI_GENERATION, 'ai')
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before generating more emails.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
          },
        }
      )
    }

    const body = await req.json()
    const vendorIds = validateArray<string>(body.vendorIds, 50) // Max 50 vendors at once
    const { weddingId } = body

    if (vendorIds.length === 0) {
      return NextResponse.json({ error: 'At least one vendor ID is required' }, { status: 400 })
    }

    if (!weddingId || typeof weddingId !== 'string') {
      return NextResponse.json({ error: 'Valid weddingId is required' }, { status: 400 })
    }

    // Get wedding details (ownership verified in query)
    const wedding = await prisma.wedding.findFirst({
      where: { id: weddingId, userId: user.dbUser.id },
      include: { user: true },
    })

    if (!wedding) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 })
    }

    // Require payment
    const paymentStatus = checkPaymentStatus(wedding)
    if (!paymentStatus.paid) {
      return NextResponse.json(
        { error: 'Payment required. Upgrade to send vendor emails.', requiresPayment: true },
        { status: 402 }
      )
    }

    // Get vendors
    const vendors = await prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
    })

    if (vendors.length === 0) {
      return NextResponse.json({ error: 'No vendors found' }, { status: 404 })
    }

    // Generate emails for each vendor
    const emails = await Promise.all(
      vendors.map(async vendor => {
        const { subject, body } = await generateVendorEmail(vendor, wedding, wedding.user.email)

        return {
          vendorId: vendor.id,
          vendorName: vendor.name,
          vendorEmail: vendor.email,
          vendorCategory: vendor.category,
          subject,
          body,
        }
      })
    )

    return NextResponse.json({
      success: true,
      emails,
      weddingId,
    })
  } catch (error) {
    console.error('Error generating emails:', error)
    return NextResponse.json({ error: 'Failed to generate emails' }, { status: 500 })
  }
}
