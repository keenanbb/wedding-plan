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

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://wedding-plan-v2.vercel.app'

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
