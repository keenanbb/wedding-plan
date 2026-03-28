import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

/**
 * Vendor unsubscribe endpoint — Spam Act 2003 compliance.
 * GET /api/unsubscribe?token=[vendorOutreachId]
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
