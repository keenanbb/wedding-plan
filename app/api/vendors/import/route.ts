import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-helpers'
import { isValidEmail } from '@/lib/input-validation'
import { checkPaymentStatus } from '@/lib/payment'
import { prisma } from '@/lib/prisma'

const VALID_CATEGORIES = ['VENUE', 'PHOTOGRAPHER', 'CATERING', 'FLORIST', 'ENTERTAINMENT', 'MARQUEE', 'OTHER'] as const
type VendorCategory = typeof VALID_CATEGORIES[number]

interface VendorInput {
  name: string
  email: string
  category: string
  location?: string
  website?: string
  phone?: string
}

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(req)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const body = await req.json()
    const { weddingId, vendors } = body

    if (!weddingId || typeof weddingId !== 'string') {
      return NextResponse.json({ error: 'Valid weddingId is required' }, { status: 400 })
    }

    if (!Array.isArray(vendors) || vendors.length === 0) {
      return NextResponse.json({ error: 'At least one vendor is required' }, { status: 400 })
    }

    if (vendors.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 vendors per batch' }, { status: 400 })
    }

    // Verify wedding ownership
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: { user: true },
    })

    if (!wedding || wedding.userId !== user.dbUser.id) {
      return NextResponse.json({ error: 'Wedding not found or access denied' }, { status: 404 })
    }

    // Require payment
    const paymentStatus = checkPaymentStatus(wedding)
    if (!paymentStatus.paid) {
      return NextResponse.json(
        { error: 'Payment required. Upgrade to import vendors.', requiresPayment: true },
        { status: 402 }
      )
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < vendors.length; i++) {
      const vendorInput = vendors[i] as VendorInput
      const rowLabel = `Row ${i + 1}`

      // Validate required fields
      if (!vendorInput.name || typeof vendorInput.name !== 'string' || !vendorInput.name.trim()) {
        errors.push(`${rowLabel}: name is required`)
        continue
      }

      if (!vendorInput.email || typeof vendorInput.email !== 'string' || !vendorInput.email.trim()) {
        errors.push(`${rowLabel} (${vendorInput.name}): email is required`)
        continue
      }

      if (!isValidEmail(vendorInput.email.trim())) {
        errors.push(`${rowLabel} (${vendorInput.name}): invalid email address`)
        continue
      }

      if (!vendorInput.category || !VALID_CATEGORIES.includes(vendorInput.category.trim().toUpperCase() as VendorCategory)) {
        errors.push(
          `${rowLabel} (${vendorInput.name}): invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
        )
        continue
      }

      const email = vendorInput.email.trim().toLowerCase()
      const name = vendorInput.name.trim()
      const category = vendorInput.category.trim().toUpperCase() as VendorCategory
      const location = vendorInput.location?.trim() || 'Unknown'

      try {
        // Check for existing vendor by email
        let vendor = await prisma.vendor.findFirst({
          where: { email },
        })

        if (!vendor) {
          // Create new vendor
          vendor = await prisma.vendor.create({
            data: {
              name,
              email,
              category,
              location,
              website: vendorInput.website?.trim() || null,
              phone: vendorInput.phone?.trim() || null,
              description: '',
            },
          })
        }

        // Check if already linked to this wedding
        const existingSavedVendor = await prisma.savedVendor.findUnique({
          where: {
            weddingId_vendorId: {
              weddingId,
              vendorId: vendor.id,
            },
          },
        })

        if (existingSavedVendor) {
          skipped++
        } else {
          await prisma.savedVendor.create({
            data: {
              weddingId,
              vendorId: vendor.id,
            },
          })
          imported++
        }
      } catch (err) {
        console.error(`Error importing vendor ${name}:`, err)
        errors.push(`${rowLabel} (${name}): failed to import`)
      }
    }

    return NextResponse.json({ imported, skipped, errors })
  } catch (error) {
    console.error('Error importing vendors:', error)
    return NextResponse.json({ error: 'Failed to import vendors' }, { status: 500 })
  }
}
