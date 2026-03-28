import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const { outreachId, responseEmail, quote, notes } = await req.json()

    if (!outreachId) {
      return NextResponse.json({ error: 'outreachId is required' }, { status: 400 })
    }

    if (!responseEmail) {
      return NextResponse.json({ error: 'responseEmail is required' }, { status: 400 })
    }

    // Get outreach record and verify ownership (checked in query)
    const outreach = await prisma.vendorOutreach.findFirst({
      where: {
        id: outreachId,
        wedding: { userId: user.dbUser.id },
      },
    })

    if (!outreach) {
      return NextResponse.json({ error: 'Outreach not found or access denied' }, { status: 404 })
    }

    // Update outreach with response
    const updated = await prisma.vendorOutreach.update({
      where: { id: outreachId },
      data: {
        responseEmail,
        replied: true,
        repliedAt: new Date(),
        quote: quote || null,
        notes: notes || null,
      },
    })

    return NextResponse.json({
      success: true,
      outreach: updated,
    })
  } catch (error) {
    console.error('Error adding response:', error)
    return NextResponse.json({ error: 'Failed to add response' }, { status: 500 })
  }
}
