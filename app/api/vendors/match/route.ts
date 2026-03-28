import { NextRequest, NextResponse } from 'next/server'

import { sanitizeString, validateGuestCount, validateBudget, validateArray } from '@/lib/input-validation'
import { findMatchingVendors } from '@/lib/vendor-matching'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawLocation = body.location
    const rawGuestCount = body.guestCount
    const rawBudgetTotal = body.budgetTotal
    const rawStyle = body.style
    const rawPreferences = body.preferences

    // Validate and sanitize inputs
    const location = sanitizeString(rawLocation)
    if (!location) {
      return NextResponse.json({ error: 'Valid location is required' }, { status: 400 })
    }

    const guestCount = validateGuestCount(rawGuestCount)
    const budgetTotal = validateBudget(rawBudgetTotal)
    const style = rawStyle ? sanitizeString(rawStyle) : undefined
    const preferences = validateArray<string>(rawPreferences, 20)

    // Find matching vendors
    const matches = await findMatchingVendors({
      location,
      guestCount,
      budgetTotal,
      style,
      preferences,
    })

    return NextResponse.json({
      matches,
      success: true,
    })
  } catch (error) {
    console.error('Vendor matching error:', error)
    return NextResponse.json({ error: 'Failed to find matching vendors' }, { status: 500 })
  }
}
